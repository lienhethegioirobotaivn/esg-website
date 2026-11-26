import { readFileSync } from "node:fs";

import { z } from "zod";

import type { TranslationLocale } from "../database/schema/index.js";

const localeTermsSchema = z.record(
  z.string(),
  z.object({
    en: z.string().optional(),
    fr: z.string().optional(),
    zh: z.string().optional(),
  }),
);

const glossarySchema = z.object({
  keep: z.array(z.string()),
  exact: localeTermsSchema,
  terms: localeTermsSchema,
});

export type Glossary = z.infer<typeof glossarySchema>;

export interface TermMapping {
  source: string;
  target: string;
}

const PLACEHOLDER = /\{[A-Za-z0-9_]+\}/g;

let cached: Glossary | undefined;

export function parseGlossary(raw: unknown): Glossary {
  return glossarySchema.parse(raw);
}

export function loadGlossary(): Glossary {
  cached ??= parseGlossary(
    JSON.parse(readFileSync(new URL("../../data/glossary.json", import.meta.url), "utf8")),
  );
  return cached;
}

export function exactTranslation(
  glossary: Glossary,
  source: string,
  locale: TranslationLocale,
): string | null {
  if (!Object.hasOwn(glossary.exact, source)) {
    return null;
  }
  return glossary.exact[source]?.[locale] ?? null;
}

export function exactSources(glossary: Glossary, locale: TranslationLocale): string[] {
  return Object.keys(glossary.exact).filter(
    (source) => exactTranslation(glossary, source, locale) !== null,
  );
}

function escapePattern(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function matchWords(text: string, words: readonly string[]): string[] {
  const alternatives = words
    .filter((word) => word.trim() !== "")
    .sort((a, b) => b.length - a.length)
    .map(escapePattern);
  if (alternatives.length === 0) {
    return [];
  }
  const pattern = new RegExp(
    `(?<![\\p{L}\\p{N}])(?:${alternatives.join("|")})(?![\\p{L}\\p{N}])`,
    "giu",
  );
  return [...text.matchAll(pattern)].map((match) => match[0]);
}

export function keepTermsIn(glossary: Glossary, source: string): string[] {
  return [...new Set(matchWords(source, glossary.keep))];
}

export function termMappingsIn(
  glossary: Glossary,
  sources: readonly string[],
  locale: TranslationLocale,
): TermMapping[] {
  const text = sources.join("\n").toLowerCase();
  const result: TermMapping[] = [];
  for (const [source, byLocale] of Object.entries(glossary.terms)) {
    const target = byLocale[locale];
    if (target !== undefined && text.includes(source.toLowerCase())) {
      result.push({ source, target });
    }
  }
  return result;
}

function placeholderSignature(text: string): string {
  return (text.match(PLACEHOLDER) ?? []).sort().join(" ");
}

export function isValidTranslation(glossary: Glossary, source: string, output: string): boolean {
  if (output.trim() === "" || output.length > source.length * 4 + 200) {
    return false;
  }
  if (placeholderSignature(source) !== placeholderSignature(output)) {
    return false;
  }
  const lowered = output.toLowerCase();
  return keepTermsIn(glossary, source).every((term) => lowered.includes(term.toLowerCase()));
}
