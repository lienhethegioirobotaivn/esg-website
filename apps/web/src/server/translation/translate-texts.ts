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

const BATCH_SIZE = 20;
const FAILURE_BACKOFF_MS = 10 * 60_000;

interface TranslationState {
  inflight: Set<string>;
  failed: Map<string, number>;
}

const shared = globalThis as typeof globalThis & {
  __esgTranslationState?: TranslationState;
};
const state = (shared.__esgTranslationState ??= {
  inflight: new Set(),
  failed: new Map(),
});

function stateKey(locale: TargetLocale, hash: string): string {
  return `${locale}:${hash}`;
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
      await callAbout("saveTranslations", { locale, items: saved });
      rememberTranslations(locale, saved);
    }
  } catch (error) {
    console.error(error);
    for (const item of prepared) {
      state.failed.set(stateKey(locale, item.hash), Date.now());
    }
  }
}

async function fillMissing(locale: TargetLocale, texts: readonly string[]): Promise<void> {
  try {
    for (let start = 0; start < texts.length; start += BATCH_SIZE) {
      await fillBatch(locale, texts.slice(start, start + BATCH_SIZE));
    }
  } finally {
    for (const source of texts) {
      state.inflight.delete(stateKey(locale, hashText(source)));
    }
  }
}

function scheduleFill(locale: TargetLocale, texts: readonly string[]): void {
  const now = Date.now();
  const pending = texts.filter((source) => {
    const key = stateKey(locale, hashText(source));
    const failedAt = state.failed.get(key);
    if (state.inflight.has(key)) {
      return false;
    }
    return failedAt === undefined || now - failedAt > FAILURE_BACKOFF_MS;
  });
  if (pending.length === 0) {
    return;
  }
  for (const source of pending) {
    state.inflight.add(stateKey(locale, hashText(source)));
  }
  const task = fillMissing(locale, pending);
  try {
    after(task);
  } catch {
    void task;
  }
}

export async function translateTexts(
  locale: TargetLocale,
  texts: readonly string[],
): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  const unique = [...new Set(texts)].filter(isTranslatable);
  if (unique.length === 0) {
    return result;
  }
  const memory = await getMemory(locale);
  const missing: string[] = [];
  for (const source of unique) {
    const exact = exactTranslation(source, locale, glossary);
    const found = exact ?? memory.get(hashText(source));
    if (found === undefined) {
      missing.push(source);
    } else {
      result.set(source, found);
    }
  }
  if (missing.length > 0) {
    scheduleFill(locale, missing);
  }
  return result;
}
