import {
  check,
  index,
  pgTable,
  smallint,
  text,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { adminUsers } from "./auth.js";
import { companies } from "./companies.js";
import { createdAt, oneOf, timestamptz, updatedAt, uuidPk } from "./columns.js";
import {
  CONTACT_CONSENTS,
  HEADCOUNT_TIERS,
  INQUIRY_KINDS,
  INQUIRY_PRIORITIES,
  INQUIRY_STATUSES,
  SECTOR_CODES,
  type ContactConsent,
  type HeadcountTier,
  type InquiryKind,
  type InquiryPriority,
  type InquiryStatus,
  type SectorCode,
} from "./enums.js";
import { reportExports, reports } from "./reports.js";

export const inquiries = pgTable(
  "inquiries",
  {
    id: uuidPk(),
    code: text().notNull().unique("inquiries_code_key"),
    kind: text().$type<InquiryKind>().notNull(),
    status: text().$type<InquiryStatus>().notNull().default("new"),
    priority: text().$type<InquiryPriority>().notNull().default("normal"),
    source: text().notNull().default("website"),
    formVersion: text(),
    companyId: uuid().references(() => companies.id, { onDelete: "set null" }),
    companyName: text().notNull(),
    headcountTier: text().$type<HeadcountTier>(),
    sector: text().$type<SectorCode>(),
    contactPhone: text(),
    contactEmail: text(),
    message: text(),
    contactConsent: text().$type<ContactConsent>().notNull().default("unconfirmed"),
    contactConsentAt: timestamptz(),
    assignedAdminId: uuid().references(() => adminUsers.id, { onDelete: "set null" }),
    firstContactedAt: timestamptz(),
    followUpAt: timestamptz(),
    outcome: text(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    check("inquiries_kind_check", oneOf(t.kind, INQUIRY_KINDS)),
    check("inquiries_status_check", oneOf(t.status, INQUIRY_STATUSES)),
    check("inquiries_priority_check", oneOf(t.priority, INQUIRY_PRIORITIES)),
    check("inquiries_headcount_tier_check", oneOf(t.headcountTier, HEADCOUNT_TIERS)),
    check("inquiries_sector_check", oneOf(t.sector, SECTOR_CODES)),
    check("inquiries_contact_consent_check", oneOf(t.contactConsent, CONTACT_CONSENTS)),
    index("inquiries_status_created_at_idx").on(t.status, t.createdAt.desc()),
    index("inquiries_kind_created_at_idx").on(t.kind, t.createdAt.desc()),
    index("inquiries_assigned_admin_id_idx").on(t.assignedAdminId),
    index("inquiries_company_id_idx").on(t.companyId),
  ],
);

export const inquiryNotes = pgTable(
  "inquiry_notes",
  {
    id: uuidPk(),
    inquiryId: uuid()
      .notNull()
      .references(() => inquiries.id, { onDelete: "cascade" }),
    adminId: uuid().references(() => adminUsers.id, { onDelete: "set null" }),
    body: text().notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("inquiry_notes_inquiry_created_at_idx").on(t.inquiryId, t.createdAt.desc())],
);

export const feedbacks = pgTable(
  "feedbacks",
  {
    id: uuidPk(),
    reportId: uuid().references(() => reports.id, { onDelete: "set null" }),
    exportId: uuid().references(() => reportExports.id, { onDelete: "set null" }),
    tokenHash: text(),
    inviteSentAt: timestamptz(),
    submittedAt: timestamptz(),
    rating: smallint(),
    comment: text(),
    formVersion: text(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("feedbacks_token_hash_key").on(t.tokenHash),
    index("feedbacks_report_id_idx").on(t.reportId),
    index("feedbacks_export_id_idx").on(t.exportId),
  ],
);
