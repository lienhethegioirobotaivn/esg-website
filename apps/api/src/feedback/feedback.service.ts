import { Inject, Injectable } from "@nestjs/common";
import { and, avg, count, desc, eq, isNotNull, isNull, type SQL } from "drizzle-orm";

import { AuditService } from "../audit/audit.service.js";
import type { AdminIdentity } from "../admin/admin.types.js";
import { newSessionToken, sha256Hex } from "../auth/crypto.js";
import { AppError } from "../common/app-error.js";
import { EXPORT_ROW_LIMIT } from "../common/pagination.js";
import type { Database } from "../database/client.js";
import { DATABASE } from "../database/database.constants.js";
import { feedbacks, reports } from "../database/schema/index.js";
import { generateRecordCode } from "../reports/report-code.js";
import { buildTableFile, type ExportFormat, type TableFile } from "../table-export/table-export.js";
import { FEEDBACK_FORM_VERSION } from "./feedback.constants.js";
import type {
  DirectFeedbackInput,
  InviteFeedbackInput,
  ListFeedbackQuery,
} from "./feedback.schemas.js";

const UNIQUE_VIOLATION = "23505";
const MAX_CODE_ATTEMPTS = 5;

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

const listColumns = {
  id: feedbacks.id,
  code: feedbacks.code,
  kind: feedbacks.kind,
  email: feedbacks.email,
  rating: feedbacks.rating,
  comment: feedbacks.comment,
  reportCode: reports.code,
  inviteSentAt: feedbacks.inviteSentAt,
  submittedAt: feedbacks.submittedAt,
  createdAt: feedbacks.createdAt,
};

@Injectable()
export class FeedbackService {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  async submitDirect(input: DirectFeedbackInput): Promise<{ code: string }> {
    for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt += 1) {
      const code = generateRecordCode("FB", 5);
      try {
        await this.db.insert(feedbacks).values({
          code,
          kind: "direct",
          email: input.email ?? null,
          rating: input.rating,
          comment: input.comment ?? null,
          formVersion: FEEDBACK_FORM_VERSION,
          submittedAt: new Date(),
        });
        return { code };
      } catch (error) {
        if (!isUniqueViolation(error) || attempt === MAX_CODE_ATTEMPTS - 1) {
          throw error;
        }
      }
    }
    throw new Error("Không sinh được mã phản hồi");
  }

  async inspectInvite(token: string): Promise<{ reportCode: string | null }> {
    const [row] = await this.db
      .select({ reportCode: reports.code, submittedAt: feedbacks.submittedAt })
      .from(feedbacks)
      .leftJoin(reports, eq(reports.id, feedbacks.reportId))
      .where(eq(feedbacks.tokenHash, sha256Hex(token)))
      .limit(1);
    if (row === undefined) {
      throw new AppError(404, "not_found", "Liên kết phản hồi không hợp lệ.");
    }
    if (row.submittedAt !== null) {
      throw new AppError(409, "feedback_used", "Liên kết này đã được sử dụng. Cảm ơn bạn đã phản hồi!");
    }
    return { reportCode: row.reportCode };
  }

  async submitInvite(token: string, input: InviteFeedbackInput): Promise<{ code: string | null }> {
    const tokenHash = sha256Hex(token);
    const [updated] = await this.db
      .update(feedbacks)
      .set({
        rating: input.rating,
        comment: input.comment ?? null,
        formVersion: FEEDBACK_FORM_VERSION,
        submittedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(feedbacks.tokenHash, tokenHash), isNull(feedbacks.submittedAt)))
      .returning({ code: feedbacks.code });
    if (updated !== undefined) {
      return { code: updated.code };
    }
    const [existing] = await this.db
      .select({ id: feedbacks.id })
      .from(feedbacks)
      .where(eq(feedbacks.tokenHash, tokenHash))
      .limit(1);
    if (existing === undefined) {
      throw new AppError(404, "not_found", "Liên kết phản hồi không hợp lệ.");
    }
    throw new AppError(409, "feedback_used", "Liên kết này đã được sử dụng. Cảm ơn bạn đã phản hồi!");
  }

  newInviteToken(): { token: string; tokenHash: string } {
    const token = newSessionToken();
    return { token, tokenHash: sha256Hex(token) };
  }

  async list(query: ListFeedbackQuery) {
    const where = this.filters(query);
    const [rows, totals, summary] = await Promise.all([
      this.db
        .select(listColumns)
        .from(feedbacks)
        .leftJoin(reports, eq(reports.id, feedbacks.reportId))
        .where(where)
        .orderBy(desc(feedbacks.createdAt), desc(feedbacks.id))
        .limit(query.limit)
        .offset(query.offset),
      this.db.select({ total: count() }).from(feedbacks).where(where),
      this.db
        .select({ answered: count(), average: avg(feedbacks.rating) })
        .from(feedbacks)
        .where(and(where, isNotNull(feedbacks.submittedAt))),
    ]);
    const average = summary[0]?.average;
    return {
      items: rows.map((row) => ({
        ...row,
        inviteSentAt: row.inviteSentAt?.toISOString() ?? null,
        submittedAt: row.submittedAt?.toISOString() ?? null,
        createdAt: row.createdAt.toISOString(),
      })),
      total: totals[0]?.total ?? 0,
      answered: summary[0]?.answered ?? 0,
      averageRating: average === null || average === undefined ? null : Math.round(Number(average) * 100) / 100,
    };
  }

  async export(
    query: ListFeedbackQuery,
    format: ExportFormat,
    actor: AdminIdentity,
    ip: string,
  ): Promise<TableFile> {
    const rows = await this.db
      .select(listColumns)
      .from(feedbacks)
      .leftJoin(reports, eq(reports.id, feedbacks.reportId))
      .where(this.filters(query))
      .orderBy(desc(feedbacks.createdAt), desc(feedbacks.id))
      .limit(EXPORT_ROW_LIMIT);
    await this.audit.record({
      actorType: "admin",
      actorId: actor.adminId,
      action: "feedback.export",
      entity: "feedback",
      meta: { format, rows: rows.length },
      ip,
    });
    return buildTableFile({
      format,
      baseName: "phan-hoi",
      sheetName: "Phản hồi",
      rows,
      columns: [
        { header: "Mã", value: (row) => row.code },
        { header: "Loại", value: (row) => row.kind },
        { header: "Email", value: (row) => row.email },
        { header: "Báo cáo", value: (row) => row.reportCode },
        { header: "Điểm", value: (row) => row.rating },
        { header: "Nhận xét", value: (row) => row.comment },
        { header: "Ngày gửi mời", value: (row) => row.inviteSentAt },
        { header: "Ngày phản hồi", value: (row) => row.submittedAt },
      ],
    });
  }

  private filters(query: ListFeedbackQuery): SQL | undefined {
    return query.kind === undefined ? undefined : eq(feedbacks.kind, query.kind);
  }
}
