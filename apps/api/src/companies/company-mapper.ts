import {
  HEADCOUNT_TIERS,
  INDUSTRY_SOURCES,
  companyProfileSchema,
  type CompanyProfile,
} from "@esg/shared/node";
import { z } from "zod";

import { AppError } from "../common/app-error.js";
import type { HeadcountTier, SectorCode } from "../database/schema/index.js";

const REPORT_CODE_FIELD = /^ESG-\d{8}-[A-Z0-9]{4}$/;

const companyFormSchema = companyProfileSchema.extend({
  reportYear: z.preprocess(
    (value) => (typeof value === "string" && value.trim() !== "" ? Number(value) : undefined),
    companyProfileSchema.shape.reportYear,
  ),
});

export interface CompanyFormInput {
  profile: CompanyProfile;
  reportCode: string | null;
}

export interface CompanyColumns {
  legalName: string;
  taxCode: string | null;
  primarySector: SectorCode;
  headcountTier: HeadcountTier;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  profile: Record<string, unknown>;
}

function textOf(body: Record<string, unknown>, key: string): string {
  const value = body[key];
  return typeof value === "string" ? value : "";
}

export function parseCompanyForm(body: unknown): CompanyFormInput {
  const record = typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
  const raw: Record<string, unknown> = {};
  for (const key of Object.keys(companyProfileSchema.shape)) {
    raw[key] = textOf(record, key);
  }

  const result = companyFormSchema.safeParse(raw);
  if (!result.success) {
    const message = result.error.issues[0]?.message ?? "Thông tin doanh nghiệp không hợp lệ.";
    throw new AppError(400, "invalid_company", message);
  }

  const industry = result.data.industry;
  const headcount = result.data.headcount;
  if (!(industry in INDUSTRY_SOURCES) || !(headcount in HEADCOUNT_TIERS)) {
    throw new AppError(400, "invalid_company", "Lĩnh vực hoặc quy mô nhân sự không hợp lệ.");
  }

  const provided = textOf(record, "reportCode");
  return {
    profile: result.data,
    reportCode: REPORT_CODE_FIELD.test(provided) ? provided : null,
  };
}

function nullable(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

export function toCompanyColumns(profile: CompanyProfile): CompanyColumns {
  return {
    legalName: profile.name.trim(),
    taxCode: nullable(profile.taxCode),
    primarySector: INDUSTRY_SOURCES[profile.industry as keyof typeof INDUSTRY_SOURCES],
    headcountTier: profile.headcount as HeadcountTier,
    contactName: nullable(profile.contactName),
    contactEmail: nullable(profile.email),
    contactPhone: nullable(profile.phone),
    profile: {
      industry: profile.industry,
      address: profile.address.trim(),
      reportPeriod: profile.reportPeriod,
      reportYear: profile.reportYear,
      reportScope: profile.reportScope.trim(),
      advisoryNeed: profile.advisoryNeed,
      assessmentNeed: profile.assessmentNeed,
    },
  };
}
