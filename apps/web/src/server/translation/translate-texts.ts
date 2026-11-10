import "server-only";

import { after } from "next/server";

import glossaryData from "@/i18n/glossary.json";
import {
  exactTranslation,
  parseGlossary,
  protect,
  restore,
} from "@/features/locale/lib/glossary";
import type { TargetLocale } from "@/features/locale/lib/glossary";
import { callAbout } from "@/server/about/bridge";

import { hashText, isTranslatable } from "./hash";
import { getMemory, rememberTranslations } from "./memory";

const glossary = parseGlossary(glossaryData);

const LANGUAGE_CODES: Record<TargetLocale, string> = {
  en: "en",
  fr: "fr",
  zh: "zh-CN",
};

const BATCH_SIZE = 10;
const CONCURRENCY = 4;
const FAILURE_BACKOFF_MS = 10 * 60_000;
const DEFAULT_WAIT_MS = 8_000;

interface TranslationState {
  inflight: Map<string, Promise<void>>;
  failed: Map<string, number>;
}

const shared = globalThis as typeof globalThis & {
  __esgTranslationState?: TranslationState;
};
const state = (shared.__esgTranslationState ??= {
  inflight: new Map(),
  failed: new Map(),
});

export interface TranslateOptions {
  waitMs?: number;
  ignoreBackoff?: boolean;
}

function stateKey(locale: TargetLocale, hash: string): string {
  return `${locale}:${hash}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fillBatch(locale: TargetLocale, texts: readonly string[]): Promise<void> {
  const prepared = texts.map((source) => ({
    source,
    hash: hashText(source),
    guarded: protect(source, locale, glossary),
  }));
  try {
    const response = await callAbout("translate", {
      source: "vi",
      target: LANGUAGE_CODES[locale],
      texts: prepared.map((item) => item.guarded.html),
    });
    const outputs = response["translations"];
    if (!Array.isArray(outputs) || outputs.length !== prepared.length) {
      throw new Error("Apps Script trả về số bản dịch không khớp.");
    }
    const saved: { hash: string; source: string; text: string }[] = [];
    prepared.forEach((item, index) => {
      const output = outputs[index];
      const text = typeof output === "string" ? restore(output, item.guarded.tokens) : null;
      if (text === null) {
        state.failed.set(stateKey(locale, item.hash), Date.now());
      } else {
        saved.push({ hash: item.hash, source: item.source, text });
      }
    });
    if (saved.length > 0) {
      rememberTranslations(locale, saved);
      await callAbout("saveTranslations", { locale, items: saved });
    }
  } catch (error) {
    console.error(error);
    for (const item of prepared) {
      state.failed.set(stateKey(locale, item.hash), Date.now());
    }
  }
}

async function fillMissing(locale: TargetLocale, texts: readonly string[]): Promise<void> {
  const batches: string[][] = [];
  for (let start = 0; start < texts.length; start += BATCH_SIZE) {
    batches.push(texts.slice(start, start + BATCH_SIZE));
  }
  let next = 0;
  const workers = Array.from({ length: Math.min(CONCURRENCY, batches.length) }, async () => {
    while (next < batches.length) {
      const batch = batches[next];
      next += 1;
      if (batch) {
        await fillBatch(locale, batch);
      }
    }
  });
  await Promise.all(workers);
}

function schedule(
  locale: TargetLocale,
  texts: readonly string[],
  ignoreBackoff: boolean,
): Promise<void>[] {
  const now = Date.now();
  const waits = new Set<Promise<void>>();
  const fresh: string[] = [];
  for (const source of texts) {
    const key = stateKey(locale, hashText(source));
    const running = state.inflight.get(key);
    if (running) {
      waits.add(running);
      continue;
    }
    const failedAt = state.failed.get(key);
    if (!ignoreBackoff && failedAt !== undefined && now - failedAt <= FAILURE_BACKOFF_MS) {
      continue;
    }
    fresh.push(source);
  }
  if (fresh.length > 0) {
    const task = fillMissing(locale, fresh).finally(() => {
      for (const source of fresh) {
        state.inflight.delete(stateKey(locale, hashText(source)));
      }
    });
    for (const source of fresh) {
      state.inflight.set(stateKey(locale, hashText(source)), task);
    }
    waits.add(task);
    try {
      after(task);
    } catch {
      void task;
    }
  }
  return [...waits];
}

export async function translateTexts(
  locale: TargetLocale,
  texts: readonly string[],
  options: TranslateOptions = {},
): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  const unique = [...new Set(texts)].filter(isTranslatable);
  if (unique.length === 0) {
    return result;
  }
  let memory = await getMemory(locale);

  function resolve(sources: readonly string[]): string[] {
    const missing: string[] = [];
    for (const source of sources) {
      const exact = exactTranslation(source, locale, glossary);
      const found = exact ?? memory.get(hashText(source));
      if (found === undefined) {
        missing.push(source);
      } else {
        result.set(source, found);
      }
    }
    return missing;
  }

  let missing = resolve(unique);
  if (missing.length > 0) {
    memory = await getMemory(locale, { refresh: true });
    missing = resolve(missing);
  }
  if (missing.length === 0) {
    return result;
  }
  const waits = schedule(locale, missing, options.ignoreBackoff === true);
  const waitMs = options.waitMs ?? DEFAULT_WAIT_MS;
  if (waits.length > 0 && waitMs > 0) {
    await Promise.race([Promise.all(waits), sleep(waitMs)]);
    resolve(missing);
  }
  return result;
}
