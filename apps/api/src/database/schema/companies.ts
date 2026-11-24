import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  jsonb,
  pgTable,
  text,
  uuid,
} from "drizzle-orm/pg-core";

import { users } from "./auth.js";
import { createdAt, oneOf, timestamptz, updatedAt, uuidPk } from "./columns.js";
import {
  CONSENT_KINDS,
  HEADCOUNT_TIERS,
  SECTOR_CODES,
  type ConsentKind,
  type HeadcountTier,
  type SectorCode,
} from "./enums.js";
import { files } from "./files.js";

export const companies = pgTable(
  "companies",
  {
    id: uuidPk(),
    userId: uuid().references(() => users.id, { onDelete: "set null" }),
    legalName: text().notNull(),
    tradeName: text(),
    taxCode: text(),
    legalForm: text(),
    countries: text()
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    primarySector: text().$type<SectorCode>(),
    secondarySectors: text()
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    headcountTier: text().$type<HeadcountTier>(),
    revenueBand: text(),
    contactName: text(),
    contactEmail: text(),
    contactPhone: text(),
    logoFileId: uuid().references(() => files.id, { onDelete: "set null" }),
    profile: jsonb().$type<Record<string, unknown>>().notNull().default({}),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    check("companies_primary_sector_check", oneOf(t.primarySector, SECTOR_CODES)),
    check("companies_headcount_tier_check", oneOf(t.headcountTier, HEADCOUNT_TIERS)),
    index("companies_user_id_idx").on(t.userId),
    index("companies_tax_code_idx").on(t.taxCode),
    index("companies_created_at_idx").on(t.createdAt.desc()),
  ],
);

export const consents = pgTable(
  "consents",
  {
    id: uuidPk(),
    companyId: uuid()
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    kind: text().$type<ConsentKind>().notNull(),
    granted: boolean().notNull(),
    grantedAt: timestamptz().notNull().defaultNow(),
    textVersion: text().notNull(),
    formVersion: text().notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    check("consents_kind_check", oneOf(t.kind, CONSENT_KINDS)),
    index("consents_company_kind_idx").on(t.companyId, t.kind, t.createdAt.desc()),
  ],
);
