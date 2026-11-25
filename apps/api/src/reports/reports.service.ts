import { reportSnapshotSchema, type MyReport } from "@esg/shared/node";
import { Inject, Injectable } from "@nestjs/common";
import { and, desc, eq, sql } from "drizzle-orm";

import type { AuthUser } from "../auth/auth.types.js";
import { AppError } from "../common/app-error.js";
import { signToken, verifyToken } from "../common/signed-token.js";
import type { UploadedFile } from "../common/uploads.js";
import { APP_ENV } from "../config/config.constants.js";
import type { AppEnv } from "../config/env.schema.js";
import type { Database } from "../database/client.js";
import { DATABASE } from "../database/database.constants.js";
import { companies, reportExports, reports } from "../database/schema/index.js";
import { FilesService, type OpenedFile } from "../files/files.service.js";
import { generateExportId } from "./report-code.js";
import { ReportLifecycleService } from "./report-lifecycle.service.js";
import { KEEP_EXPORTS_PER_REPORT } from "./reports.constants.js";
import type { ExportFields } from "./reports.schemas.js";

export interface CreateExportInput {
  fields: ExportFields;
  pdf: UploadedFile | null;
  docx: UploadedFile | null;
  user: AuthUser | null;
}

export interface CreateExportResult {
  exportId: string;
  reportCode: string;
  attachToken: string | null;
}

export type OwnerLinkStatus = "attached" | "already";

const UNIQUE_VIOLATION = "23505";
const MAX_EXPORT_ATTEMPTS = 3;

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

const notFound = (): AppError =>
  new AppError(404, "report_not_found", "Không tìm thấy báo cáo này trong tài khoản của bạn.");

@Injectable()
export class ReportsService {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    @Inject(APP_ENV) private readonly env: AppEnv,
    @Inject(FilesService) private readonly files: FilesService,
    @Inject(ReportLifecycleService) private readonly lifecycle: ReportLifecycleService,
  ) {}

  async createExport(input: CreateExportInput): Promise<CreateExportResult> {
    const snapshot = this.parseSnapshot(input.fields.snapshot);
    if (input.pdf === null && input.docx === null) {
      throw new AppError(400, "invalid_request", "Cần ít nhất một tệp PDF hoặc Word.");
    }

    const [report] = await this.db
      .select({
        id: reports.id,
        ownerUserId: reports.ownerUserId,
        companyId: reports.companyId,
        bankVersionId: reports.bankVersionId,
      })
      .from(reports)
      .where(eq(reports.code, input.fields.reportCode))
      .limit(1);
    if (report === undefined) {
      throw new AppError(404, "report_not_found", "Chưa có hồ sơ doanh nghiệp cho mã báo cáo này.");
    }
    if (report.ownerUserId !== null && report.ownerUserId !== input.user?.userId) {
      throw new AppError(403, "forbidden", "Báo cáo này đã gắn với một email khác.");
    }

    const ownerUserId = input.user?.userId ?? null;
    const pdf =
      input.pdf === null
        ? null
        : await this.files.upload({
            buffer: input.pdf.buffer,
            kind: "export_pdf",
            ownerUserId,
            originalName: input.pdf.originalname,
          });
    const uploaded: string[] = pdf === null ? [] : [pdf.id];
    try {
      const docx =
        input.docx === null
          ? null
          : await this.files.upload({
              buffer: input.docx.buffer,
              kind: "export_docx",
              ownerUserId,
              originalName: input.docx.originalname,
            });
      if (docx !== null) {
        uploaded.push(docx.id);
      }

      for (let attempt = 0; attempt < MAX_EXPORT_ATTEMPTS; attempt += 1) {
        const exportId = generateExportId();
        try {
          await this.db.transaction(async (tx) => {
            await tx.select({ id: reports.id }).from(reports).where(eq(reports.id, report.id)).for("update");
            await tx.insert(reportExports).values({
              exportCode: exportId,
              reportId: report.id,
              bankVersionId: report.bankVersionId,
              snapshot,
              pdfFileId: pdf?.id ?? null,
              docxFileId: docx?.id ?? null,
              locale: input.fields.locale,
              brand: input.fields.theme,
              status: input.fields.status,
            });
            await tx
              .update(reports)
              .set({
                status: "exported",
                lastExportAt: sql`now()`,
                updatedAt: sql`now()`,
                ownerUserId: report.ownerUserId ?? ownerUserId,
              })
              .where(eq(reports.id, report.id));
            if (ownerUserId !== null) {
              await tx
                .update(companies)
                .set({ userId: ownerUserId })
                .where(and(eq(companies.id, report.companyId), sql`${companies.userId} is null`));
            }
            await this.files.markReferenced(tx, uploaded);
            await this.pruneIn(tx, report.id);
          });
          return {
            exportId,
            reportCode: input.fields.reportCode,
            attachToken:
              report.ownerUserId === null && ownerUserId === null
                ? signToken(this.env.SESSION_SECRET, "attach", exportId)
                : null,
          };
        } catch (error) {
          if (!isUniqueViolation(error) || attempt === MAX_EXPORT_ATTEMPTS - 1) {
            throw error;
          }
        }
      }
      throw new Error("Không tạo được mã bản xuất");
    } catch (error) {
      await this.files.markDeleted(this.db, uploaded).catch(() => undefined);
      throw error;
    }
  }

  async attach(exportId: string, token: string, user: AuthUser): Promise<OwnerLinkStatus> {
    if (!verifyToken(this.env.SESSION_SECRET, "attach", exportId, token)) {
      throw new AppError(403, "invalid_attach_token", "Phiên gắn báo cáo đã hết hạn. Hãy xuất lại báo cáo.");
    }
    const [row] = await this.db
      .select({ reportId: reports.id })
      .from(reportExports)
      .innerJoin(reports, eq(reports.id, reportExports.reportId))
      .where(eq(reportExports.exportCode, exportId))
      .limit(1);
    if (row === undefined) {
      throw new AppError(404, "report_not_found", "Bản xuất này không còn tồn tại.");
    }
    return this.link(row.reportId, user);
  }

  async claim(reportCode: string, token: string, user: AuthUser): Promise<OwnerLinkStatus> {
    if (!verifyToken(this.env.SESSION_SECRET, "claim", reportCode, token)) {
      throw new AppError(403, "invalid_claim_token", "Phiên nhận báo cáo đã hết hạn.");
    }
    const [row] = await this.db
      .select({ reportId: reports.id })
      .from(reports)
      .where(eq(reports.code, reportCode))
      .limit(1);
    if (row === undefined) {
      throw new AppError(404, "report_not_found", "Báo cáo này không còn tồn tại.");
    }
    return this.link(row.reportId, user);
  }

  async listMine(user: AuthUser): Promise<{ reports: MyReport[] }> {
    const rows = await this.db
      .select({
        exportId: reportExports.exportCode,
        reportCode: reports.code,
        createdAt: reportExports.createdAt,
        locale: reportExports.locale,
        status: reportExports.status,
        theme: reportExports.brand,
        pdfFileId: reportExports.pdfFileId,
        docxFileId: reportExports.docxFileId,
        company: companies.legalName,
      })
      .from(reportExports)
      .innerJoin(reports, eq(reports.id, reportExports.reportId))
      .innerJoin(companies, eq(companies.id, reports.companyId))
      .where(eq(reports.ownerUserId, user.userId))
      .orderBy(desc(reportExports.createdAt), desc(reportExports.id));
    return {
      reports: rows.map((row) => ({
        exportId: row.exportId,
        reportCode: row.reportCode,
        time: row.createdAt.toISOString(),
        locale: row.locale,
        status: row.status,
        company: row.company,
        theme: row.theme,
        pdf: row.pdfFileId !== null,
        docx: row.docxFileId !== null,
      })),
    };
  }

  async snapshotOf(exportId: string, user: AuthUser): Promise<{ snapshot: unknown; reportCode: string }> {
    const row = await this.findOwned(exportId, user);
    return { snapshot: row.snapshot, reportCode: row.reportCode };
  }

  async fileOf(exportId: string, format: "pdf" | "docx", user: AuthUser): Promise<OpenedFile> {
    const row = await this.findOwned(exportId, user);
    const fileId = format === "pdf" ? row.pdfFileId : row.docxFileId;
    const opened = fileId === null ? null : await this.files.open(fileId);
    if (opened === null) {
      throw new AppError(404, "file_not_found", "Không tìm thấy tệp này.");
    }
    return opened;
  }

  async deleteExport(exportId: string, user: AuthUser): Promise<void> {
    const row = await this.findOwned(exportId, user);
    await this.lifecycle.removeExport(row.id);
  }

  private async link(reportId: string, user: AuthUser): Promise<OwnerLinkStatus> {
    return this.db.transaction(async (tx) => {
      const [report] = await tx
        .select({ ownerUserId: reports.ownerUserId, companyId: reports.companyId })
        .from(reports)
        .where(eq(reports.id, reportId))
        .for("update");
      if (report === undefined) {
        throw notFound();
      }
      if (report.ownerUserId === user.userId) {
        return "already";
      }
      if (report.ownerUserId !== null) {
        throw new AppError(409, "owner_conflict", "Báo cáo này đã gắn với một email khác.");
      }
      await tx
        .update(reports)
        .set({ ownerUserId: user.userId, updatedAt: sql`now()` })
        .where(eq(reports.id, reportId));
      await tx
        .update(companies)
        .set({ userId: user.userId })
        .where(and(eq(companies.id, report.companyId), sql`${companies.userId} is null`));
      return "attached";
    });
  }

  private async findOwned(exportId: string, user: AuthUser) {
    const [row] = await this.db
      .select({
        id: reportExports.id,
        snapshot: reportExports.snapshot,
        pdfFileId: reportExports.pdfFileId,
        docxFileId: reportExports.docxFileId,
        reportCode: reports.code,
      })
      .from(reportExports)
      .innerJoin(reports, eq(reports.id, reportExports.reportId))
      .where(and(eq(reportExports.exportCode, exportId), eq(reports.ownerUserId, user.userId)))
      .limit(1);
    if (row === undefined) {
      throw notFound();
    }
    return row;
  }

  private async pruneIn(
    tx: Parameters<Parameters<Database["transaction"]>[0]>[0],
    reportId: string,
  ): Promise<void> {
    const surplus = await tx
      .select({
        id: reportExports.id,
        pdfFileId: reportExports.pdfFileId,
        docxFileId: reportExports.docxFileId,
      })
      .from(reportExports)
      .where(eq(reportExports.reportId, reportId))
      .orderBy(desc(reportExports.createdAt), desc(reportExports.id))
      .offset(KEEP_EXPORTS_PER_REPORT);
    if (surplus.length === 0) {
      return;
    }
    await tx.delete(reportExports).where(
      sql`${reportExports.id} in (${sql.join(
        surplus.map((row) => sql`${row.id}`),
        sql`, `,
      )})`,
    );
    await this.files.markDeleted(
      tx,
      surplus.flatMap((row) => [row.pdfFileId, row.docxFileId]).filter((id): id is string => id !== null),
    );
  }

  private parseSnapshot(text: string): Record<string, unknown> {
    let value: unknown;
    try {
      value = JSON.parse(text);
    } catch {
      throw new AppError(400, "invalid_snapshot", "Nội dung báo cáo không hợp lệ.");
    }
    const result = reportSnapshotSchema.safeParse(value);
    if (!result.success) {
      throw new AppError(400, "invalid_snapshot", "Nội dung báo cáo không hợp lệ.");
    }
    return result.data as Record<string, unknown>;
  }
}
