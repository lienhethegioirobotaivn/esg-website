import { Inject, Injectable, Logger } from "@nestjs/common";
import { and, count, eq, inArray, isNotNull, isNull, lt, sql } from "drizzle-orm";
import type pg from "pg";

import { APP_ENV } from "../config/config.constants.js";
import type { AppEnv } from "../config/env.schema.js";
import type { Database } from "../database/client.js";
import { DATABASE, DATABASE_POOL } from "../database/database.constants.js";
import { TRANSLATION_LOCALES, translations, type TranslationLocale } from "../database/schema/index.js";
import { RateLimitService } from "../rate-limit/rate-limit.service.js";
import { ContentSourcesService } from "./content-sources.service.js";
import {
  exactTranslation,
  isValidTranslation,
  keepTermsIn,
  loadGlossary,
  termMappingsIn,
} from "./glossary.js";
import { hashText } from "./hash.js";
import { chunk } from "./translation-memory.service.js";
import {
  TRANSLATION_BACKOFF_HOURS,
  TRANSLATION_BATCH_CHARS,
  TRANSLATION_BATCH_SIZE,
  TRANSLATION_BUDGET_KEY,
  TRANSLATION_BUDGET_WINDOW_SECONDS,
  TRANSLATION_LOCK_NAME,
  TRANSLATION_MAX_FAILED_ATTEMPTS,
  TRANSLATION_QUERY_CHUNK,
} from "./translation.constants.js";
import { TRANSLATOR, TranslatorError, type Translator } from "./translator.js";

export type StoppedReason = "time_budget" | "daily_limit" | "rate_limited" | "error";

export interface LocaleProgress {
  total: number;
  translated: number;
  remaining: number;
}

export interface TranslationRunResult {
  configured: boolean;
  stoppedReason: StoppedReason | null;
  requests: number;
  locales: Partial<Record<TranslationLocale, LocaleProgress>>;
}

export interface TranslationPruneResult {
  removed: number;
  keptManual: number;
  skipped: boolean;
}

export interface TranslationRunOptions {
  budgetMs: number;
  locales?: readonly TranslationLocale[];
  retryFailed?: boolean;
}

interface Batch {
  locale: TranslationLocale;
  texts: string[];
}

export function makeBatches(texts: readonly string[]): string[][] {
  const batches: string[][] = [];
  let current: string[] = [];
  let size = 0;
  for (const text of texts) {
    const full =
      current.length >= TRANSLATION_BATCH_SIZE || size + text.length > TRANSLATION_BATCH_CHARS;
    if (current.length > 0 && full) {
      batches.push(current);
      current = [];
      size = 0;
    }
    current.push(text);
    size += text.length;
  }
  if (current.length > 0) {
    batches.push(current);
  }
  return batches;
}

function interleave(queues: readonly Batch[][]): Batch[] {
  const result: Batch[] = [];
  const longest = Math.max(0, ...queues.map((queue) => queue.length));
  for (let index = 0; index < longest; index += 1) {
    for (const queue of queues) {
      const batch = queue[index];
      if (batch !== undefined) {
        result.push(batch);
      }
    }
  }
  return result;
}

@Injectable()
export class TranslationService {
  private readonly logger = new Logger("Translation");

  constructor(
    @Inject(DATABASE_POOL) private readonly pool: pg.Pool,
    @Inject(DATABASE) private readonly db: Database,
    @Inject(APP_ENV) private readonly env: AppEnv,
    @Inject(TRANSLATOR) private readonly translator: Translator | null,
    @Inject(ContentSourcesService) private readonly sources: ContentSourcesService,
    @Inject(RateLimitService) private readonly rateLimit: RateLimitService,
  ) {}

  get configured(): boolean {
    return this.translator !== null;
  }

  run(options: TranslationRunOptions): Promise<TranslationRunResult | null> {
    return this.withLock(async () => {
      const deadline = Date.now() + options.budgetMs;
      const { live } = await this.sources.collect();
      await this.sync(live);
      const locales = options.locales ?? TRANSLATION_LOCALES;
      let requests = 0;
      let stoppedReason: StoppedReason | null = null;

      if (this.translator !== null) {
        const queues: Batch[][] = [];
        for (const locale of locales) {
          const pending = await this.pending(locale, live, options.retryFailed === true);
          queues.push(makeBatches(pending).map((texts) => ({ locale, texts })));
        }
        for (const batch of interleave(queues)) {
          if (Date.now() >= deadline) {
            stoppedReason = "time_budget";
            break;
          }
          const budget = await this.rateLimit.hit({
            key: TRANSLATION_BUDGET_KEY,
            limit: this.env.TRANSLATION_DAILY_LIMIT,
            windowSeconds: TRANSLATION_BUDGET_WINDOW_SECONDS,
          });
          if (!budget.allowed) {
            stoppedReason = "daily_limit";
            break;
          }
          requests += 1;
          stoppedReason = await this.translateBatch(this.translator, batch);
          if (stoppedReason !== null) {
            break;
          }
        }
      }

      const progress: Partial<Record<TranslationLocale, LocaleProgress>> = {};
      for (const locale of locales) {
        progress[locale] = await this.progress(locale, live);
      }
      return { configured: this.configured, stoppedReason, requests, locales: progress };
    });
  }

  prune(graceHours: number): Promise<TranslationPruneResult | null> {
    return this.withLock(async () => {
      const { all, hasBank } = await this.sources.collect();
      if (!hasBank) {
        return { removed: 0, keptManual: 0, skipped: true };
      }
      const keep = all.map(hashText);
      const unused = sql`${translations.sourceHash} <> all(${sql.param(keep)}::text[])`;
      const removed = await this.db
        .delete(translations)
        .where(
          and(
            isNull(translations.manualText),
            lt(translations.updatedAt, sql`now() - make_interval(hours => ${graceHours})`),
            unused,
          ),
        )
        .returning({ sourceHash: translations.sourceHash });
      const [manual] = await this.db
        .select({ total: count() })
        .from(translations)
        .where(and(isNotNull(translations.manualText), unused));
      return { removed: removed.length, keptManual: manual?.total ?? 0, skipped: false };
    });
  }

  private async sync(live: readonly string[]): Promise<void> {
    for (const texts of chunk(live, TRANSLATION_QUERY_CHUNK)) {
      await this.db
        .insert(translations)
        .values(
          TRANSLATION_LOCALES.flatMap((locale) =>
            texts.map((text) => ({ sourceHash: hashText(text), locale, sourceText: text })),
          ),
        )
        .onConflictDoNothing();
    }
  }

  private async stored(locale: TranslationLocale, texts: readonly string[]) {
    const result = new Map<
      string,
      {
        autoText: string | null;
        manualText: string | null;
        failedAttempts: number;
        retryAfter: Date | null;
      }
    >();
    for (const hashes of chunk(texts.map(hashText), TRANSLATION_QUERY_CHUNK)) {
      const rows = await this.db
        .select({
          sourceHash: translations.sourceHash,
          autoText: translations.autoText,
          manualText: translations.manualText,
          failedAttempts: translations.failedAttempts,
          retryAfter: translations.retryAfter,
        })
        .from(translations)
        .where(and(eq(translations.locale, locale), inArray(translations.sourceHash, hashes)));
      for (const row of rows) {
        result.set(row.sourceHash, row);
      }
    }
    return result;
  }

  private async pending(
    locale: TranslationLocale,
    live: readonly string[],
    retryFailed: boolean,
  ): Promise<string[]> {
    const glossary = loadGlossary();
    const stored = await this.stored(locale, live);
    const now = Date.now();
    return live.filter((text) => {
      const row = stored.get(hashText(text));
      if (row === undefined || exactTranslation(glossary, text, locale) !== null) {
        return false;
      }
      if (row.manualText !== null || row.autoText !== null) {
        return false;
      }
      if (retryFailed) {
        return true;
      }
      return (
        row.failedAttempts < TRANSLATION_MAX_FAILED_ATTEMPTS &&
        (row.retryAfter === null || row.retryAfter.getTime() <= now)
      );
    });
  }

  private async progress(
    locale: TranslationLocale,
    live: readonly string[],
  ): Promise<LocaleProgress> {
    const glossary = loadGlossary();
    const stored = await this.stored(locale, live);
    const translated = live.filter((text) => {
      const row = stored.get(hashText(text));
      return (
        exactTranslation(glossary, text, locale) !== null ||
        (row !== undefined && (row.manualText !== null || row.autoText !== null))
      );
    }).length;
    return { total: live.length, translated, remaining: live.length - translated };
  }

  private async translateBatch(
    translator: Translator,
    batch: Batch,
  ): Promise<StoppedReason | null> {
    const glossary = loadGlossary();
    let outputs: (string | null)[];
    try {
      outputs = await translator.translate({
        locale: batch.locale,
        texts: batch.texts,
        keep: [...new Set(batch.texts.flatMap((text) => keepTermsIn(glossary, text)))],
        terms: termMappingsIn(glossary, batch.texts, batch.locale),
      });
    } catch (error) {
      if (!(error instanceof TranslatorError)) {
        throw error;
      }
      this.logger.warn(error.message);
      return error.rateLimited ? "rate_limited" : "error";
    }

    for (const [index, source] of batch.texts.entries()) {
      const output = outputs[index]?.trim() ?? null;
      const key = and(
        eq(translations.sourceHash, hashText(source)),
        eq(translations.locale, batch.locale),
      );
      if (output !== null && isValidTranslation(glossary, source, output)) {
        await this.db
          .update(translations)
          .set({ autoText: output, failedAttempts: 0, retryAfter: null, updatedAt: new Date() })
          .where(and(key, isNull(translations.autoText)));
      } else {
        await this.markFailed(source, batch.locale);
      }
    }
    return null;
  }

  private async markFailed(source: string, locale: TranslationLocale): Promise<void> {
    const key = and(
      eq(translations.sourceHash, hashText(source)),
      eq(translations.locale, locale),
    );
    const [row] = await this.db
      .select({ failedAttempts: translations.failedAttempts })
      .from(translations)
      .where(key);
    if (row === undefined) {
      return;
    }
    const attempts = row.failedAttempts + 1;
    const hours =
      TRANSLATION_BACKOFF_HOURS[Math.min(attempts, TRANSLATION_BACKOFF_HOURS.length) - 1] ?? 1;
    await this.db
      .update(translations)
      .set({
        failedAttempts: attempts,
        retryAfter: new Date(Date.now() + hours * 3_600_000),
        updatedAt: new Date(),
      })
      .where(key);
  }

  private async withLock<T>(task: () => Promise<T>): Promise<T | null> {
    const client = await this.pool.connect();
    let locked = false;
    try {
      const lock = await client.query<{ locked: boolean }>(
        "select pg_try_advisory_lock(hashtext($1)) as locked",
        [TRANSLATION_LOCK_NAME],
      );
      locked = lock.rows[0]?.locked === true;
      return locked ? await task() : null;
    } finally {
      if (locked) {
        await client
          .query("select pg_advisory_unlock(hashtext($1))", [TRANSLATION_LOCK_NAME])
          .catch(() => undefined);
      }
      client.release();
    }
  }
}
