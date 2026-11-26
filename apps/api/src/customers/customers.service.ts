import { Inject, Injectable } from "@nestjs/common";
import { and, count, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";

import { AuditService } from "../audit/audit.service.js";
import type { AdminIdentity } from "../admin/admin.types.js";
import { AppError } from "../common/app-error.js";
import { EXPORT_ROW_LIMIT, escapeLike } from "../common/pagination.js";
import type { Database } from "../database/client.js";
import { DATABASE } from "../database/database.constants.js";
import { adminUsers, companies, consents, reports } from "../database/schema/index.js";
import { buildTableFile, type ExportFormat, type TableFile } from "../table-export/table-export.js";
import type { ListCustomersQuery, UpdateCustomerInput } from "./customers.schemas.js";

const reportCount = sql<number>`(select count(*)::int from reports r where r.company_id = companies.id)`;
const advisoryConsent = sql<boolean | null>`(select c.granted from consents c where c.company_id = companies.id and c.kind = 'advisory' order by c.created_at desc limit 1)`;

const listColumns = {
  id: companies.id,
  legalName: companies.legalName,
  tradeName: companies.tradeName,
  taxCode: companies.taxCode,
  primarySector: companies.primarySector,
  headcountTier: companies.headcountTier,
  contactName: companies.contactName,
  contactEmail: companies.contactEmail,
  contactPhone: companies.contactPhone,
  careStatus: companies.careStatus,
  nextContactAt: companies.nextContactAt,
  firstContactedAt: companies.firstContactedAt,
  careNote: companies.careNote,
  assignedAdminId: companies.assignedAdminId,
  createdAt: companies.createdAt,
  reportCount,
  advisoryConsent,
};

function iso(value: Date | null): string | null {
  return value === null ? null : value.toISOString();
}

function view(row: {
  id: string;
  legalName: string;
  tradeName: string | null;
  taxCode: string | null;
  primarySector: string | null;
  headcountTier: string | null;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  careStatus: string;
  nextContactAt: Date | null;
  firstContactedAt: Date | null;
  careNote: string | null;
  assignedAdminId: string | null;
  createdAt: Date;
  reportCount: number;
  advisoryConsent: boolean | null;
}) {
  return {
    ...row,
    nextContactAt: iso(row.nextContactAt),
    firstContactedAt: iso(row.firstContactedAt),
    createdAt: row.createdAt.toISOString(),
  };
}

@Injectable()
export class CustomersService {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  async list(query: ListCustomersQuery) {
    const where = this.filters(query);
    const [rows, totals] = await Promise.all([
      this.db
        .select(listColumns)
        .from(companies)
        .where(where)
        .orderBy(desc(companies.createdAt), desc(companies.id))
        .limit(query.limit)
        .offset(query.offset),
      this.db.select({ total: count() }).from(companies).where(where),
    ]);
    return { items: rows.map(view), total: totals[0]?.total ?? 0 };
  }

  async detail(id: string) {
    const [row] = await this.db.select(listColumns).from(companies).where(eq(companies.id, id)).limit(1);
    if (row === undefined) {
      throw new AppError(404, "not_found", "Không tìm thấy khách hàng.");
    }
    const [reportRows, consentRows, assignee] = await Promise.all([
      this.db
        .select({
          code: reports.code,
          status: reports.status,
          lastExportAt: reports.lastExportAt,
          createdAt: reports.createdAt,
        })
        .from(reports)
        .where(eq(reports.companyId, id))
        .orderBy(desc(reports.createdAt)),
      this.db
        .select({
          kind: consents.kind,
          granted: consents.granted,
          grantedAt: consents.grantedAt,
          textVersion: consents.textVersion,
        })
        .from(consents)
        .where(eq(consents.companyId, id))
        .orderBy(desc(consents.createdAt)),
      row.assignedAdminId === null
        ? Promise.resolve([])
        : this.db
            .select({ id: adminUsers.id, name: adminUsers.name })
            .from(adminUsers)
            .where(eq(adminUsers.id, row.assignedAdminId))
            .limit(1),
    ]);
    return {
      ...view(row),
      assignee: assignee[0] ?? null,
      reports: reportRows.map((report) => ({
        code: report.code,
        status: report.status,
        lastExportAt: iso(report.lastExportAt),
        createdAt: report.createdAt.toISOString(),
      })),
      consents: consentRows.map((consent) => ({
        ...consent,
        grantedAt: consent.grantedAt.toISOString(),
      })),
    };
  }

  async update(id: string, input: UpdateCustomerInput, actor: AdminIdentity, ip: string) {
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
        .select({
          careStatus: companies.careStatus,
          firstContactedAt: companies.firstContactedAt,
        })
        .from(companies)
        .where(eq(companies.id, id))
        .for("update");
      if (current === undefined) {
        throw new AppError(404, "not_found", "Không tìm thấy khách hàng.");
      }
      const startsContact =
        input.careStatus !== undefined &&
        input.careStatus !== "new" &&
        current.firstContactedAt === null;
      await tx
        .update(companies)
        .set({
          ...(input.careStatus === undefined ? {} : { careStatus: input.careStatus }),
          ...(input.nextContactAt === undefined
            ? {}
            : { nextContactAt: input.nextContactAt === null ? null : new Date(input.nextContactAt) }),
          ...(input.careNote === undefined ? {} : { careNote: input.careNote }),
          ...(input.assignedAdminId === undefined ? {} : { assignedAdminId: input.assignedAdminId }),
          ...(startsContact ? { firstContactedAt: new Date() } : {}),
          updatedAt: new Date(),
        })
        .where(eq(companies.id, id));
      await this.audit.record(
        {
          actorType: "admin",
          actorId: actor.adminId,
          action: "customer.update",
          entity: "company",
          entityId: id,
          meta: {
            changed: Object.keys(input),
            ...(input.careStatus === undefined
              ? {}
              : { from: current.careStatus, to: input.careStatus }),
          },
          ip,
        },
        tx,
      );
    });
    return this.detail(id);
  }

  async export(
    query: ListCustomersQuery,
    format: ExportFormat,
    actor: AdminIdentity,
    ip: string,
  ): Promise<TableFile> {
    const rows = await this.db
      .select(listColumns)
      .from(companies)
      .where(this.filters(query))
      .orderBy(desc(companies.createdAt), desc(companies.id))
      .limit(EXPORT_ROW_LIMIT);
    await this.audit.record({
      actorType: "admin",
      actorId: actor.adminId,
      action: "customer.export",
      entity: "company",
      meta: { format, rows: rows.length },
      ip,
    });
    return buildTableFile({
      format,
      baseName: "khach-hang",
      sheetName: "Khách hàng",
      rows,
      columns: [
        { header: "Tên pháp lý", value: (row) => row.legalName },
        { header: "Tên thương mại", value: (row) => row.tradeName },
        { header: "Mã số thuế", value: (row) => row.taxCode },
        { header: "Ngành chính", value: (row) => row.primarySector },
        { header: "Quy mô", value: (row) => row.headcountTier },
        { header: "Người liên hệ", value: (row) => row.contactName },
        { header: "Email", value: (row) => row.contactEmail },
        { header: "Điện thoại", value: (row) => row.contactPhone },
        { header: "Số báo cáo", value: (row) => row.reportCount },
        {
          header: "Đồng ý tư vấn",
          value: (row) => (row.advisoryConsent === null ? "" : row.advisoryConsent ? "có" : "không"),
        },
        { header: "Trạng thái chăm sóc", value: (row) => row.careStatus },
        { header: "Liên hệ tiếp theo", value: (row) => row.nextContactAt },
        { header: "Ghi chú", value: (row) => row.careNote },
        { header: "Ngày tạo", value: (row) => row.createdAt },
      ],
    });
  }

  private filters(query: ListCustomersQuery): SQL | undefined {
    const conditions: SQL[] = [];
    if (query.careStatus !== undefined) {
      conditions.push(eq(companies.careStatus, query.careStatus));
    }
    if (query.assignedAdminId !== undefined) {
      conditions.push(eq(companies.assignedAdminId, query.assignedAdminId));
    }
    if (query.q !== undefined) {
      const pattern = `%${escapeLike(query.q)}%`;
      const match = or(
        ilike(companies.legalName, pattern),
        ilike(companies.tradeName, pattern),
        ilike(companies.contactEmail, pattern),
        ilike(companies.taxCode, pattern),
      );
      if (match !== undefined) {
        conditions.push(match);
      }
    }
    return conditions.length === 0 ? undefined : and(...conditions);
  }
}
