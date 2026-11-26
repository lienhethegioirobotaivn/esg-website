import { Inject, Injectable } from "@nestjs/common";
import { and, asc, count, eq, ilike, inArray, isNotNull, isNull, or, sql, type SQL } from "drizzle-orm";

import type { AdminIdentity } from "../admin/admin.types.js";
import { AuditService } from "../audit/audit.service.js";
import { AppError } from "../common/app-error.js";
import { escapeLike } from "../common/pagination.js";
import type { Database } from "../database/client.js";
import { DATABASE } from "../database/database.constants.js";
import { translations, type TranslationLocale } from "../database/schema/index.js";
import { exactSources, exactTranslation, loadGlossary } from "./glossary.js";
import type { AdminTranslationsQuery, ManualTranslationsInput } from "./translation.schemas.js";

export type TranslationStatus = "manual" | "glossary" | "auto" | "missing";

export interface AdminTranslation {
  sourceHash: string;
  sourceText: string;
  autoText: string | null;
  manualText: string | null;
  glossaryText: string | null;
  status: TranslationStatus;
  failedAttempts: number;
  updatedAt: string;
}

export interface AdminTranslationList {
  items: AdminTranslation[];
  total: number;
}

function statusFilter(
  status: AdminTranslationsQuery["status"],
  locale: TranslationLocale,
): SQL | undefined {
  if (status === "manual") {
    return isNotNull(translations.manualText);
  }
  const covered = sql`${translations.sourceText} = any(${sql.param(exactSources(loadGlossary(), locale))}::text[])`;
  if (status === "auto") {
    return and(
      isNull(translations.manualText),
      isNotNull(translations.autoText),
      sql`not (${covered})`,
    );
  }
  if (status === "missing") {
    return and(
      isNull(translations.manualText),
      isNull(translations.autoText),
      sql`not (${covered})`,
    );
  }
  return undefined;
}

@Injectable()
export class TranslationAdminService {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  async list(query: AdminTranslationsQuery): Promise<AdminTranslationList> {
    const pattern = query.q === undefined ? undefined : `%${escapeLike(query.q)}%`;
    const filter = and(
      eq(translations.locale, query.locale),
      statusFilter(query.status, query.locale),
      pattern === undefined
        ? undefined
        : or(
            ilike(translations.sourceText, pattern),
            ilike(translations.autoText, pattern),
            ilike(translations.manualText, pattern),
          ),
    );
    const rows = await this.db
      .select()
      .from(translations)
      .where(filter)
      .orderBy(asc(translations.sourceText), asc(translations.sourceHash))
      .limit(query.limit)
      .offset(query.offset);
    const [totals] = await this.db.select({ total: count() }).from(translations).where(filter);
    const glossary = loadGlossary();
    const items = rows.map((row): AdminTranslation => {
      const glossaryText = exactTranslation(glossary, row.sourceText, query.locale);
      let status: TranslationStatus = "missing";
      if (row.manualText !== null) {
        status = "manual";
      } else if (glossaryText !== null) {
        status = "glossary";
      } else if (row.autoText !== null) {
        status = "auto";
      }
      return {
        sourceHash: row.sourceHash,
        sourceText: row.sourceText,
        autoText: row.autoText,
        manualText: row.manualText,
        glossaryText,
        status,
        failedAttempts: row.failedAttempts,
        updatedAt: row.updatedAt.toISOString(),
      };
    });
    return { items, total: totals?.total ?? 0 };
  }

  async setManual(
    input: ManualTranslationsInput,
    actor: AdminIdentity,
    ip: string,
  ): Promise<number> {
    const hashes = input.items.map((item) => item.sourceHash);
    await this.db.transaction(async (tx) => {
      const known = await tx
        .select({ sourceHash: translations.sourceHash, sourceText: translations.sourceText })
        .from(translations)
        .where(inArray(translations.sourceHash, hashes));
      const sources = new Map(known.map((row) => [row.sourceHash, row.sourceText]));
      for (const item of input.items) {
        const sourceText = sources.get(item.sourceHash);
        if (sourceText === undefined) {
          throw new AppError(404, "translation_not_found", "Không tìm thấy câu cần dịch.");
        }
        await tx
          .insert(translations)
          .values({
            sourceHash: item.sourceHash,
            locale: input.locale,
            sourceText,
            manualText: item.manualText,
          })
          .onConflictDoUpdate({
            target: [translations.sourceHash, translations.locale],
            set: {
              manualText: item.manualText,
              failedAttempts: 0,
              retryAfter: null,
              updatedAt: new Date(),
            },
          });
      }
      await this.audit.record(
        {
          actorType: "admin",
          actorId: actor.adminId,
          action: "translation.update",
          entity: "translation",
          entityId: input.locale,
          meta: {
            locale: input.locale,
            set: input.items.filter((item) => item.manualText !== null).length,
            cleared: input.items.filter((item) => item.manualText === null).length,
          },
          ip,
        },
        tx,
      );
    });
    return input.items.length;
  }
}
