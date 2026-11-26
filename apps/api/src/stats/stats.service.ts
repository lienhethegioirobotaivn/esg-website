import { Inject, Injectable } from "@nestjs/common";
import { flattenIssues, statItemSchema, statsInputSchema, type StatItem } from "@esg/shared/node";
import { eq } from "drizzle-orm";
import { z } from "zod";

import type { AdminIdentity } from "../admin/admin.types.js";
import { AuditService } from "../audit/audit.service.js";
import { AppError } from "../common/app-error.js";
import type { Database } from "../database/client.js";
import { DATABASE } from "../database/database.constants.js";
import { siteStats, type Locale } from "../database/schema/index.js";
import { TranslationMemoryService } from "../translation/translation-memory.service.js";
import { ACHIEVEMENT_STATS_KEY } from "./stats.constants.js";

export interface AdminStats {
  items: StatItem[];
  updatedAt: string | null;
}

const storedSchema = z.array(statItemSchema);

@Injectable()
export class StatsService {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    @Inject(TranslationMemoryService) private readonly memory: TranslationMemoryService,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  async read(locale: Locale): Promise<{ items: StatItem[] }> {
    const { items } = await this.current();
    const map = await this.memory.lookup(
      locale,
      items.map((item) => item.label),
    );
    return { items: items.map((item) => ({ ...item, label: map.get(item.label) ?? item.label })) };
  }

  async current(): Promise<AdminStats> {
    const [row] = await this.db
      .select({ value: siteStats.value, updatedAt: siteStats.updatedAt })
      .from(siteStats)
      .where(eq(siteStats.key, ACHIEVEMENT_STATS_KEY))
      .limit(1);
    if (row === undefined) {
      return { items: [], updatedAt: null };
    }
    const parsed = storedSchema.safeParse(row.value);
    return { items: parsed.success ? parsed.data : [], updatedAt: row.updatedAt.toISOString() };
  }

  async save(raw: unknown, actor: AdminIdentity, ip: string): Promise<AdminStats> {
    const parsed = statsInputSchema.safeParse(raw);
    if (!parsed.success) {
      throw new AppError(
        400,
        "invalid_stats",
        "Dữ liệu chưa hợp lệ. Vui lòng kiểm tra các mục được đánh dấu.",
        { fields: flattenIssues(parsed.error) },
      );
    }
    const { items } = parsed.data;
    await this.db.transaction(async (tx) => {
      await tx
        .insert(siteStats)
        .values({ key: ACHIEVEMENT_STATS_KEY, value: items })
        .onConflictDoUpdate({ target: siteStats.key, set: { value: items, updatedAt: new Date() } });
      await this.audit.record(
        {
          actorType: "admin",
          actorId: actor.adminId,
          action: "stats.update",
          entity: "site_stats",
          entityId: ACHIEVEMENT_STATS_KEY,
          meta: { items: items.length },
          ip,
        },
        tx,
      );
    });
    return this.current();
  }
}
