import { Inject, Injectable } from "@nestjs/common";
import { and, count, eq, isNull, lt, sql } from "drizzle-orm";

import type { Database } from "../database/client.js";
import { DATABASE } from "../database/database.constants.js";
import {
  companies,
  evidenceFiles,
  reportExports,
  reports,
} from "../database/schema/index.js";
import { FilesService } from "../files/files.service.js";
import {
  ABANDONED_REPORT_MAX_AGE_DAYS,
  UNATTACHED_EXPORT_MAX_AGE_HOURS,
} from "./reports.constants.js";

type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];

const CLEANUP_BATCH = 200;

function present(ids: readonly (string | null)[]): string[] {
  return ids.filter((id): id is string => id !== null);
}

@Injectable()
export class ReportLifecycleService {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    @Inject(FilesService) private readonly files: FilesService,
  ) {}

  async removeExport(exportRowId: string): Promise<void> {
    await this.db.transaction(async (tx) => {
      const [removed] = await tx
        .delete(reportExports)
        .where(eq(reportExports.id, exportRowId))
        .returning({
          reportId: reportExports.reportId,
          pdfFileId: reportExports.pdfFileId,
          docxFileId: reportExports.docxFileId,
        });
      if (removed === undefined) {
        return;
      }
      await this.files.markDeleted(tx, present([removed.pdfFileId, removed.docxFileId]));

      const [remaining] = await tx
        .select({ total: count() })
        .from(reportExports)
        .where(eq(reportExports.reportId, removed.reportId));
      if ((remaining?.total ?? 0) === 0) {
        await this.removeReportIn(tx, removed.reportId);
      }
    });
  }

  async removeReport(reportId: string): Promise<void> {
    await this.db.transaction((tx) => this.removeReportIn(tx, reportId));
  }

  async removeUnattachedExports(): Promise<number> {
    const stale = await this.db
      .select({ id: reportExports.id })
      .from(reportExports)
      .innerJoin(reports, eq(reports.id, reportExports.reportId))
      .where(
        and(
          isNull(reports.ownerUserId),
          lt(
            reportExports.createdAt,
            sql`now() - make_interval(hours => ${UNATTACHED_EXPORT_MAX_AGE_HOURS})`,
          ),
        ),
      )
      .limit(CLEANUP_BATCH);
    for (const row of stale) {
      await this.removeExport(row.id);
    }
    return stale.length;
  }

  async removeAbandonedReports(): Promise<number> {
    const abandoned = await this.db
      .select({ id: reports.id })
      .from(reports)
      .where(
        and(
          isNull(reports.ownerUserId),
          lt(reports.createdAt, sql`now() - make_interval(days => ${ABANDONED_REPORT_MAX_AGE_DAYS})`),
          sql`not exists (select 1 from report_exports e where e.report_id = ${reports.id})`,
        ),
      )
      .limit(CLEANUP_BATCH);
    for (const row of abandoned) {
      await this.removeReport(row.id);
    }
    return abandoned.length;
  }

  private async removeReportIn(tx: Transaction, reportId: string): Promise<void> {
    const evidence = await tx
      .select({ fileId: evidenceFiles.fileId })
      .from(evidenceFiles)
      .where(eq(evidenceFiles.reportId, reportId));
    const exportsLeft = await tx
      .select({ pdf: reportExports.pdfFileId, docx: reportExports.docxFileId })
      .from(reportExports)
      .where(eq(reportExports.reportId, reportId));

    const [removed] = await tx
      .delete(reports)
      .where(eq(reports.id, reportId))
      .returning({ companyId: reports.companyId });
    if (removed === undefined) {
      return;
    }

    const fileIds = present([
      ...evidence.map((row) => row.fileId),
      ...exportsLeft.flatMap((row) => [row.pdf, row.docx]),
    ]);

    const [others] = await tx
      .select({ total: count() })
      .from(reports)
      .where(eq(reports.companyId, removed.companyId));
    if ((others?.total ?? 0) === 0) {
      const [company] = await tx
        .delete(companies)
        .where(eq(companies.id, removed.companyId))
        .returning({ logoFileId: companies.logoFileId });
      if (company?.logoFileId !== null && company?.logoFileId !== undefined) {
        fileIds.push(company.logoFileId);
      }
    }
    await this.files.markDeleted(tx, fileIds);
  }
}
