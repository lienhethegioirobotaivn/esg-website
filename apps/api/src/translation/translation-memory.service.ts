import { Inject, Injectable } from "@nestjs/common";
import { and, eq, inArray, or, isNotNull } from "drizzle-orm";

import type { Database } from "../database/client.js";
import { DATABASE } from "../database/database.constants.js";
import { translations, type Locale, type TranslationLocale } from "../database/schema/index.js";
import { exactTranslation, loadGlossary } from "./glossary.js";
import { hashText, uniqueTranslatable } from "./hash.js";
import { TRANSLATION_QUERY_CHUNK } from "./translation.constants.js";

export function chunk<T>(items: readonly T[], size: number): T[][] {
  const result: T[][] = [];
  for (let start = 0; start < items.length; start += size) {
    result.push(items.slice(start, start + size));
  }
  return result;
}

@Injectable()
export class TranslationMemoryService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async lookup(locale: Locale, texts: readonly string[]): Promise<Map<string, string>> {
    const result = new Map<string, string>();
    if (locale === "vi") {
      return result;
    }
    const sources = uniqueTranslatable(texts);
    if (sources.length === 0) {
      return result;
    }
    const stored = new Map<string, { autoText: string | null; manualText: string | null }>();
    for (const hashes of chunk(sources.map(hashText), TRANSLATION_QUERY_CHUNK)) {
      const rows = await this.db
        .select({
          sourceHash: translations.sourceHash,
          autoText: translations.autoText,
          manualText: translations.manualText,
        })
        .from(translations)
        .where(and(eq(translations.locale, locale), inArray(translations.sourceHash, hashes)));
      for (const row of rows) {
        stored.set(row.sourceHash, row);
      }
    }
    const glossary = loadGlossary();
    for (const source of sources) {
      const row = stored.get(hashText(source));
      const found =
        row?.manualText ?? exactTranslation(glossary, source, locale) ?? row?.autoText ?? null;
      if (found !== null) {
        result.set(source, found);
      }
    }
    return result;
  }

  async dictionary(locale: TranslationLocale): Promise<Record<string, string>> {
    const rows = await this.db
      .select({
        sourceHash: translations.sourceHash,
        autoText: translations.autoText,
        manualText: translations.manualText,
      })
      .from(translations)
      .where(
        and(
          eq(translations.locale, locale),
          or(isNotNull(translations.autoText), isNotNull(translations.manualText)),
        ),
      )
      .orderBy(translations.sourceHash);
    const glossary = loadGlossary();
    const items = new Map<string, string>();
    for (const row of rows) {
      if (row.autoText !== null) {
        items.set(row.sourceHash, row.autoText);
      }
    }
    for (const source of Object.keys(glossary.exact)) {
      const exact = exactTranslation(glossary, source, locale);
      if (exact !== null) {
        items.set(hashText(source), exact);
      }
    }
    for (const row of rows) {
      if (row.manualText !== null) {
        items.set(row.sourceHash, row.manualText);
      }
    }
    return Object.fromEntries(items);
  }
}
