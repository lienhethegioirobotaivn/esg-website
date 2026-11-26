import { Inject, Injectable } from "@nestjs/common";
import { and, count, desc, eq, ilike, or, type SQL } from "drizzle-orm";

import { AuditService } from "../audit/audit.service.js";
import type { AdminIdentity } from "../admin/admin.types.js";
import { AppError } from "../common/app-error.js";
import { EXPORT_ROW_LIMIT, escapeLike } from "../common/pagination.js";
import { APP_ENV } from "../config/config.constants.js";
import type { AppEnv } from "../config/env.schema.js";
import type { Database } from "../database/client.js";
import { DATABASE } from "../database/database.constants.js";
import { adminUsers, inquiries, inquiryNotes, reports } from "../database/schema/index.js";
import { MailService } from "../mail/mail.service.js";
import { generateRecordCode } from "../reports/report-code.js";
import { buildTableFile, type ExportFormat, type TableFile } from "../table-export/table-export.js";
import { INQUIRY_FORM_VERSION } from "./inquiries.constants.js";
import type {
  CreateInquiryInput,
  ListInquiriesQuery,
  UpdateInquiryInput,
} from "./inquiries.schemas.js";

type InquiryRow = typeof inquiries.$inferSelect;

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

function view(row: InquiryRow) {
  return {
    id: row.id,
    code: row.code,
    kind: row.kind,
    status: row.status,
    priority: row.priority,
    source: row.source,
    companyId: row.companyId,
    companyName: row.companyName,
    headcountTier: row.headcountTier,
    sector: row.sector,
    contactPhone: row.contactPhone,
    contactEmail: row.contactEmail,
    message: row.message,
    contactConsent: row.contactConsent,
    assignedAdminId: row.assignedAdminId,
    firstContactedAt: row.firstContactedAt?.toISOString() ?? null,
    followUpAt: row.followUpAt?.toISOString() ?? null,
    outcome: row.outcome,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

@Injectable()
export class InquiriesService {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    @Inject(MailService) private readonly mail: MailService,
    @Inject(AuditService) private readonly audit: AuditService,
    @Inject(APP_ENV) private readonly env: AppEnv,
  ) {}

  async create(input: CreateInquiryInput, ip: string): Promise<{ code: string }> {
    const companyId = await this.companyFromReport(input.reportCode);
    for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt += 1) {
      const code = generateRecordCode(input.kind === "consulting" ? "TV" : "KD", 5);
      try {
        await this.db.transaction(async (tx) => {
          const [row] = await tx
            .insert(inquiries)
            .values({
              code,
              kind: input.kind,
              companyId,
              companyName: input.companyName,
              headcountTier: input.headcountTier ?? null,
              sector: input.sector ?? null,
              contactEmail: input.contactEmail ?? null,
              contactPhone: input.contactPhone ?? null,
              message: input.message ?? null,
              formVersion: INQUIRY_FORM_VERSION,
              contactConsent: input.contactConsent ? "yes" : "unconfirmed",
              contactConsentAt: input.contactConsent ? new Date() : null,
            })
            .returning({ id: inquiries.id });
          if (row === undefined) {
            throw new Error("Không tạo được yêu cầu");
          }
          await this.audit.record(
            {
              actorType: "system",
              actorId: null,
              action: "inquiry.create",
              entity: "inquiry",
              entityId: row.id,
              meta: { code, kind: input.kind },
              ip,
            },
            tx,
          );
          if (this.env.ADMIN_NOTIFY_EMAIL !== undefined) {
            await this.mail.enqueue(
              {
                to: this.env.ADMIN_NOTIFY_EMAIL,
                template: "inquiry_notice",
                payload: {
                  code,
                  kind: input.kind,
                  companyName: input.companyName,
                  url: `${this.env.PUBLIC_BASE_URL.replace(/\/$/, "")}/admin/inquiries/${code}`,
                },
              },
              tx,
            );
          }
        });
        return { code };
      } catch (error) {
        if (!isUniqueViolation(error) || attempt === MAX_CODE_ATTEMPTS - 1) {
          throw error;
        }
      }
    }
    throw new Error("Không sinh được mã yêu cầu");
  }

  async list(query: ListInquiriesQuery) {
    const where = this.filters(query);
    const [rows, totals] = await Promise.all([
      this.db
        .select()
        .from(inquiries)
        .where(where)
        .orderBy(desc(inquiries.createdAt), desc(inquiries.id))
        .limit(query.limit)
        .offset(query.offset),
      this.db.select({ total: count() }).from(inquiries).where(where),
    ]);
    return { items: rows.map(view), total: totals[0]?.total ?? 0 };
  }

  async detail(id: string) {
    const [row] = await this.db.select().from(inquiries).where(eq(inquiries.id, id)).limit(1);
    if (row === undefined) {
      throw new AppError(404, "not_found", "Không tìm thấy yêu cầu.");
    }
    const notes = await this.db
      .select({
        id: inquiryNotes.id,
        body: inquiryNotes.body,
        adminId: inquiryNotes.adminId,
        adminName: adminUsers.name,
        createdAt: inquiryNotes.createdAt,
      })
      .from(inquiryNotes)
      .leftJoin(adminUsers, eq(adminUsers.id, inquiryNotes.adminId))
      .where(eq(inquiryNotes.inquiryId, id))
      .orderBy(desc(inquiryNotes.createdAt));
    return {
      ...view(row),
      notes: notes.map((note) => ({ ...note, createdAt: note.createdAt.toISOString() })),
    };
  }

  async update(id: string, input: UpdateInquiryInput, actor: AdminIdentity, ip: string) {
    if (input.assignedAdminId !== undefined && input.assignedAdminId !== null) {
      const [assignee] = await this.db
        .select({ id: adminUsers.id })
        .from(adminUsers)
        .where(and(eq(adminUsers.id, input.assignedAdminId), eq(adminUsers.active, true)))
        .limit(1);
      if (assignee === undefined) {
        throw new AppError(400, "invalid_assignee", "Người phụ trách không tồn tại hoặc đã bị vô hiệu hóa.");
      }
    }

    await this.db.transaction(async (tx) => {
      const [current] = await tx
        .select({ status: inquiries.status, firstContactedAt: inquiries.firstContactedAt })
        .from(inquiries)
        .where(eq(inquiries.id, id))
        .for("update");
      if (current === undefined) {
        throw new AppError(404, "not_found", "Không tìm thấy yêu cầu.");
      }
      const startsContact =
        input.status !== undefined &&
        input.status !== "new" &&
        input.status !== "invalid" &&
        current.firstContactedAt === null;
      await tx
        .update(inquiries)
        .set({
          ...(input.status === undefined ? {} : { status: input.status }),
          ...(input.priority === undefined ? {} : { priority: input.priority }),
          ...(input.assignedAdminId === undefined ? {} : { assignedAdminId: input.assignedAdminId }),
          ...(input.followUpAt === undefined
            ? {}
            : { followUpAt: input.followUpAt === null ? null : new Date(input.followUpAt) }),
          ...(input.outcome === undefined ? {} : { outcome: input.outcome }),
          ...(startsContact ? { firstContactedAt: new Date() } : {}),
          updatedAt: new Date(),
        })
        .where(eq(inquiries.id, id));
      await this.audit.record(
        {
          actorType: "admin",
          actorId: actor.adminId,
          action: "inquiry.update",
          entity: "inquiry",
          entityId: id,
          meta: {
            changed: Object.keys(input),
            ...(input.status === undefined ? {} : { from: current.status, to: input.status }),
          },
          ip,
        },
        tx,
      );
    });
    return this.detail(id);
  }

  async addNote(id: string, body: string, actor: AdminIdentity, ip: string) {
    await this.db.transaction(async (tx) => {
      const [existing] = await tx
        .select({ id: inquiries.id })
        .from(inquiries)
        .where(eq(inquiries.id, id))
        .for("update");
      if (existing === undefined) {
        throw new AppError(404, "not_found", "Không tìm thấy yêu cầu.");
      }
      await tx.insert(inquiryNotes).values({ inquiryId: id, adminId: actor.adminId, body });
      await tx.update(inquiries).set({ updatedAt: new Date() }).where(eq(inquiries.id, id));
      await this.audit.record(
        {
          actorType: "admin",
          actorId: actor.adminId,
          action: "inquiry.note",
          entity: "inquiry",
          entityId: id,
          ip,
        },
        tx,
      );
    });
    return this.detail(id);
  }

  async export(
    query: ListInquiriesQuery,
    format: ExportFormat,
    actor: AdminIdentity,
    ip: string,
  ): Promise<TableFile> {
    const rows = await this.db
      .select()
      .from(inquiries)
      .where(this.filters(query))
      .orderBy(desc(inquiries.createdAt), desc(inquiries.id))
      .limit(EXPORT_ROW_LIMIT);
    await this.audit.record({
      actorType: "admin",
      actorId: actor.adminId,
      action: "inquiry.export",
      entity: "inquiry",
      meta: { format, rows: rows.length },
      ip,
    });
    return buildTableFile({
      format,
      baseName: "yeu-cau",
      sheetName: "Yêu cầu",
      rows,
      columns: [
        { header: "Mã", value: (row) => row.code },
        { header: "Loại", value: (row) => row.kind },
        { header: "Trạng thái", value: (row) => row.status },
        { header: "Ưu tiên", value: (row) => row.priority },
        { header: "Doanh nghiệp", value: (row) => row.companyName },
        { header: "Email", value: (row) => row.contactEmail },
        { header: "Điện thoại", value: (row) => row.contactPhone },
        { header: "Quy mô", value: (row) => row.headcountTier },
        { header: "Ngành", value: (row) => row.sector },
        { header: "Nội dung", value: (row) => row.message },
        { header: "Đồng ý liên hệ", value: (row) => row.contactConsent },
        { header: "Kết quả", value: (row) => row.outcome },
        { header: "Ngày tạo", value: (row) => row.createdAt },
      ],
    });
  }

  private filters(query: ListInquiriesQuery): SQL | undefined {
    const conditions: SQL[] = [];
    if (query.status !== undefined) {
      conditions.push(eq(inquiries.status, query.status));
    }
    if (query.kind !== undefined) {
      conditions.push(eq(inquiries.kind, query.kind));
    }
    if (query.assignedAdminId !== undefined) {
      conditions.push(eq(inquiries.assignedAdminId, query.assignedAdminId));
    }
    if (query.q !== undefined) {
      const pattern = `%${escapeLike(query.q)}%`;
      const match = or(
        ilike(inquiries.companyName, pattern),
        ilike(inquiries.code, pattern),
        ilike(inquiries.contactEmail, pattern),
      );
      if (match !== undefined) {
        conditions.push(match);
      }
    }
    return conditions.length === 0 ? undefined : and(...conditions);
  }

  private async companyFromReport(reportCode: string | undefined): Promise<string | null> {
    if (reportCode === undefined) {
      return null;
    }
    const [row] = await this.db
      .select({ companyId: reports.companyId })
      .from(reports)
      .where(eq(reports.code, reportCode))
      .limit(1);
    return row?.companyId ?? null;
  }
}
