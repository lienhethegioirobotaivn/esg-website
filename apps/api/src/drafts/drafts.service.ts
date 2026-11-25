import { draftSnapshotSchema } from "@esg/shared/node";
import { Inject, Injectable } from "@nestjs/common";
import { and, eq, isNull, sql } from "drizzle-orm";

import type { AuthUser } from "../auth/auth.types.js";
import { AppError } from "../common/app-error.js";
import type { Database } from "../database/client.js";
import { DATABASE } from "../database/database.constants.js";
import { reportDrafts } from "../database/schema/index.js";
import { requireOwnedReport } from "../reports/owned-report.js";
import { MAX_DRAFT_CHARS } from "./drafts.constants.js";
import type { PutDraftInput } from "./drafts.schemas.js";

export interface DraftView {
  data: Record<string, unknown>;
  schemaVersion: number;
  updatedAt: string;
}

const UNIQUE_VIOLATION = "23505";

function isUniqueViolation(error: unknown): boolean {
  let current: unknown = error;
  while (typeof current === "object" && current !== null) {
    if ((current as { code?: unknown }).code === UNIQUE_VIOLATION) {
      return true;
    }
    current = (current as { cause?: unknown }).cause;
  }
  return false;
}

const invalidDraft = (): AppError =>
  new AppError(400, "invalid_draft", "Bản nháp không hợp lệ hoặc quá lớn.");

@Injectable()
export class DraftsService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async read(user: AuthUser, reportCode: string | null): Promise<DraftView | null> {
    const reportId = await this.resolveReportId(user, reportCode);
    const [row] = await this.db
      .select({
        data: reportDrafts.data,
        schemaVersion: reportDrafts.schemaVersion,
        updatedAt: reportDrafts.updatedAt,
      })
      .from(reportDrafts)
      .where(this.scope(user.userId, reportId))
      .limit(1);
    return row === undefined
      ? null
      : { data: row.data, schemaVersion: row.schemaVersion, updatedAt: row.updatedAt.toISOString() };
  }

  async write(user: AuthUser, input: PutDraftInput): Promise<{ updatedAt: string }> {
    if (JSON.stringify(input.data).length > MAX_DRAFT_CHARS) {
      throw invalidDraft();
    }
    const parsed = draftSnapshotSchema.safeParse(input.data);
    if (!parsed.success) {
      throw invalidDraft();
    }
    const reportId = await this.resolveReportId(user, input.reportCode);

    try {
      return await this.db.transaction(async (tx) => {
        const [existing] = await tx
          .select({ id: reportDrafts.id, updatedAt: reportDrafts.updatedAt })
          .from(reportDrafts)
          .where(this.scope(user.userId, reportId))
          .for("update");

        if (existing === undefined) {
          const [created] = await tx
            .insert(reportDrafts)
            .values({
              userId: user.userId,
              reportId,
              data: input.data,
              schemaVersion: input.schemaVersion,
            })
            .returning({ updatedAt: reportDrafts.updatedAt });
          return { updatedAt: (created?.updatedAt ?? new Date()).toISOString() };
        }

        const current = existing.updatedAt.toISOString();
        if (input.overwrite !== true && input.baseUpdatedAt !== current) {
          throw new AppError(409, "draft_conflict", "Đã có bản nháp khác trên máy chủ.", {
            updatedAt: current,
          });
        }
        const [updated] = await tx
          .update(reportDrafts)
          .set({
            data: input.data,
            schemaVersion: input.schemaVersion,
            updatedAt: sql`clock_timestamp()`,
          })
          .where(eq(reportDrafts.id, existing.id))
          .returning({ updatedAt: reportDrafts.updatedAt });
        return { updatedAt: (updated?.updatedAt ?? new Date()).toISOString() };
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new AppError(409, "draft_conflict", "Đã có bản nháp khác trên máy chủ.");
      }
      throw error;
    }
  }

  async remove(user: AuthUser, reportCode: string | null): Promise<void> {
    const reportId = await this.resolveReportId(user, reportCode);
    await this.db.delete(reportDrafts).where(this.scope(user.userId, reportId));
  }

  private async resolveReportId(user: AuthUser, reportCode: string | null | undefined): Promise<string | null> {
    if (reportCode === null || reportCode === undefined) {
      return null;
    }
    return (await requireOwnedReport(this.db, reportCode, user.userId)).id;
  }

  private scope(userId: string, reportId: string | null) {
    return and(
      eq(reportDrafts.userId, userId),
      reportId === null ? isNull(reportDrafts.reportId) : eq(reportDrafts.reportId, reportId),
    );
  }
}
