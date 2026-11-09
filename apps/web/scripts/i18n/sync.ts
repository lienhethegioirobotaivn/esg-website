import { existsSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { extractSources } from "./extract";
import { exactTranslation, loadGlossary, protect, restore } from "./glossary";
import type { Glossary, TargetLocale } from "./glossary";
import { readProviderConfig, translateBatch } from "./provider";

type Dictionary = Record<string, string>;

const TARGET_LOCALES: TargetLocale[] = ["en", "fr", "zh"];
const BATCH_SIZE = 20;
const BATCH_MAX_CHARS = 8_000;

const args = new Set(process.argv.slice(2));
const isCheck = args.has("--check");
const keepOrphans = args.has("--keep-orphans");
const skipTranslate = args.has("--no-translate") || process.env["I18N_SKIP"] === "1";
const onlyLocale = process.argv
  .slice(2)
  .find((arg) => arg.startsWith("--locale="))
  ?.slice("--locale=".length);

function loadEnvFiles(cwd: string): void {
  for (const name of [".env.local", ".env"]) {
    const file = path.join(cwd, name);
    if (!existsSync(file)) {
      continue;
    }
    for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
      const match = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/.exec(line);
      if (!match || match[1] === undefined || match[2] === undefined) {
        continue;
      }
      const key = match[1];
      const value = match[2].replace(/^(['"])(.*)\1$/, "$2");
      if (process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
  }
}

function readDictionary(file: string): Dictionary {
  if (!existsSync(file)) {
    return {};
  }
  const parsed: unknown = JSON.parse(readFileSync(file, "utf8"));
  const result: Dictionary = {};
  if (typeof parsed === "object" && parsed !== null) {
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === "string") {
        result[key] = value;
      }
    }
  }
  return result;
}

function serialize(dictionary: Dictionary): string {
  const sorted: Dictionary = {};
  for (const key of Object.keys(dictionary).sort((a, b) => a.localeCompare(b, "vi"))) {
    sorted[key] = dictionary[key] ?? "";
  }
  return `${JSON.stringify(sorted, null, 2)}\n`;
}

function writeIfChanged(file: string, dictionary: Dictionary): boolean {
  const next = serialize(dictionary);
  const current = existsSync(file) ? readFileSync(file, "utf8") : "";
  if (current.replace(/\r\n/g, "\n") === next) {
    return false;
  }
  const useCrlf = current !== "" ? current.includes("\r\n") : os.EOL === "\r\n";
  writeFileSync(file, useCrlf ? next.replace(/\n/g, "\r\n") : next);
  return true;
}

function chunk(items: string[]): string[][] {
  const batches: string[][] = [];
  let current: string[] = [];
  let size = 0;
  for (const item of items) {
    if (current.length > 0 && (current.length >= BATCH_SIZE || size + item.length > BATCH_MAX_CHARS)) {
      batches.push(current);
      current = [];
      size = 0;
    }
    current.push(item);
    size += item.length;
  }
  if (current.length > 0) {
    batches.push(current);
  }
  return batches;
}

async function syncLocale(
  locale: TargetLocale,
  sources: string[],
  messagesDir: string,
  overridesDir: string,
  glossary: Glossary,
): Promise<{ missing: number; translated: number; failed: string[] }> {
  const file = path.join(messagesDir, `${locale}.json`);
  const generated = readDictionary(file);
  const overrides = readDictionary(path.join(overridesDir, `${locale}.json`));
  const wanted = new Set(sources);

  if (!keepOrphans) {
    for (const key of Object.keys(generated)) {
      if (!wanted.has(key)) {
        delete generated[key];
      }
    }
  }

  let pending = sources.filter((source) => generated[source] === undefined && overrides[source] === undefined);
  for (const source of pending) {
    const direct = exactTranslation(source, locale, glossary) ?? (/\p{L}/u.test(source) ? null : source);
    if (direct !== null) {
      generated[source] = direct;
    }
  }
  pending = pending.filter((source) => generated[source] === undefined);

  let translated = 0;
  const failed: string[] = [];
  const provider = readProviderConfig();

  if (!isCheck && !skipTranslate && pending.length > 0) {
    if (provider === null) {
      console.warn(
        `[i18n] ${locale}: còn ${pending.length} chuỗi chưa dịch nhưng chưa cấu hình GOOGLE_APPS_SCRIPT_URL / GOOGLE_APPS_SCRIPT_SECRET, bỏ qua.`,
      );
    } else {
      try {
        for (const batch of chunk(pending)) {
          const prepared = batch.map((source) => protect(source, locale, glossary));
          const outputs = await translateBatch(
            provider,
            locale,
            prepared.map((item) => item.html),
          );
          batch.forEach((source, index) => {
            const prepare = prepared[index];
            const output = outputs[index];
            const value =
              prepare !== undefined && output !== undefined
                ? restore(output, prepare.tokens)
                : null;
            if (value === null) {
              failed.push(source);
            } else {
              generated[source] = value;
              translated += 1;
            }
          });
          writeIfChanged(file, generated);
          console.log(`[i18n] ${locale}: đã dịch ${translated}/${pending.length} chuỗi.`);
        }
      } catch (error) {
        console.warn(
          `[i18n] ${locale}: dừng dịch do lỗi: ${error instanceof Error ? error.message : String(error)}. Chạy lại lệnh để dịch tiếp.`,
        );
      }
    }
  }

  if (!isCheck) {
    writeIfChanged(file, generated);
  }

  const missing = sources.filter(
    (source) => generated[source] === undefined && overrides[source] === undefined,
  ).length;
  return { missing, translated, failed };
}

async function main(): Promise<number> {
  const cwd = process.cwd();
  const srcDir = path.join(cwd, "src");
  if (!existsSync(srcDir)) {
    console.error("[i18n] Hãy chạy lệnh trong thư mục apps/web.");
    return 1;
  }
  loadEnvFiles(cwd);

  const sharedDir = path.resolve(cwd, "../../packages/shared/src");
  const roots = [srcDir, ...(existsSync(sharedDir) ? [sharedDir] : [])];
  const sourceMap = extractSources(roots);
  const sources = [...sourceMap.keys()].sort((a, b) => a.localeCompare(b, "vi"));

  const i18nDir = path.join(srcDir, "i18n");
  const glossary = loadGlossary(path.join(i18nDir, "glossary.json"));
  const locales = TARGET_LOCALES.filter((locale) => !onlyLocale || locale === onlyLocale);

  console.log(`[i18n] Tìm thấy ${sources.length} chuỗi nguồn tiếng Việt.`);
  let totalMissing = 0;
  for (const locale of locales) {
    const result = await syncLocale(
      locale,
      sources,
      path.join(i18nDir, "messages"),
      path.join(i18nDir, "overrides"),
      glossary,
    );
    totalMissing += result.missing;
    if (result.failed.length > 0) {
      console.warn(
        `[i18n] ${locale}: ${result.failed.length} chuỗi dịch xong nhưng mất biến hoặc thuật ngữ cần giữ, đã bỏ qua (thêm vào overrides/${locale}.json nếu muốn dịch tay):`,
      );
      for (const source of result.failed) {
        console.warn(`    - ${source}`);
      }
    }
    console.log(`[i18n] ${locale}: còn thiếu ${result.missing} chuỗi.`);
  }

  if (isCheck && totalMissing > 0) {
    console.error("[i18n] Còn chuỗi chưa có bản dịch. Chạy: pnpm i18n:sync");
    return 1;
  }
  return 0;
}

main().then(
  (code) => {
    process.exitCode = code;
  },
  (error: unknown) => {
    console.error(`[i18n] Lỗi: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = isCheck ? 1 : 0;
  },
);
