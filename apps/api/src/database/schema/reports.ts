import {
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

import { users } from "./auth.js";
import { companies } from "./companies.js";
import { createdAt, oneOf, timestamptz, updatedAt, uuidPk } from "./columns.js";
import {
  LOCALES,
  EXPORT_STATUSES,
  REPORT_BRANDS,
  REPORT_STATUSES,
  type ExportStatus,
  type Locale,
  type ReportBrand,
  type ReportStatus,
} from "./enums.js";
import { files } from "./files.js";
import { questionBanks } from "./question-bank.js";

export const reports = pgTable(
  "reports",
  {
    id: uuidPk(),
    code: text().notNull().unique("reports_code_key"),
    companyId: uuid()
      .notNull()
      .references(() => companies.id),
    ownerUserId: uuid().references(() => users.id, { onDelete: "set null" }),
    status: text().$type<ReportStatus>().notNull().default("draft"),
    bankVersionId: uuid()
      .notNull()
      .references(() => questionBanks.id),
    lastExportAt: timestamptz(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    check("reports_status_check", oneOf(t.status, REPORT_STATUSES)),
    index("reports_owner_updated_at_idx").on(t.ownerUserId, t.updatedAt.desc()),
    index("reports_company_id_idx").on(t.companyId),
    index("reports_bank_version_id_idx").on(t.bankVersionId),
  ],
);

export const reportExports = pgTable(
  "report_exports",
  {
    id: uuidPk(),
    exportCode: text().notNull().unique("report_exports_export_code_key"),
    reportId: uuid()
      .notNull()
      .references(() => reports.id, { onDelete: "cascade" }),
    bankVersionId: uuid()
      .notNull()
      .references(() => questionBanks.id),
    snapshot: jsonb().$type<Record<string, unknown>>().notNull(),
    pdfFileId: uuid().references(() => files.id, { onDelete: "set null" }),
    docxFileId: uuid().references(() => files.id, { onDelete: "set null" }),
    locale: text().$type<Locale>().notNull(),
    brand: text().$type<ReportBrand>().notNull().default("default"),
    status: text().$type<ExportStatus>().notNull().default("draft"),
    createdAt: createdAt(),
  },
  (t) => [
    check("report_exports_status_check", oneOf(t.status, EXPORT_STATUSES)),
    check("report_exports_locale_check", oneOf(t.locale, LOCALES)),
    check("report_exports_brand_check", oneOf(t.brand, REPORT_BRANDS)),
    index("report_exports_report_created_at_idx").on(t.reportId, t.createdAt.desc()),
    index("report_exports_bank_version_id_idx").on(t.bankVersionId),
  ],
);

export const reportDrafts = pgTable(
  "report_drafts",
  {
    id: uuidPk(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    reportId: uuid().references(() => reports.id, { onDelete: "cascade" }),
    data: jsonb().$type<Record<string, unknown>>().notNull(),
    schemaVersion: integer().notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    unique("report_drafts_user_report_key").on(t.userId, t.reportId).nullsNotDistinct(),
    index("report_drafts_updated_at_idx").on(t.updatedAt),
  ],
);
