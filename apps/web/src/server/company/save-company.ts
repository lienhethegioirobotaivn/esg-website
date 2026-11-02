import "server-only";

import { randomInt } from "node:crypto";

import {
  MAX_LOGO_SIZE_BYTES,
  REPORT_PERIOD_LABELS,
  companyProfileSchema,
  flattenIssues,
} from "@esg/shared";
import type { CompanyProfile } from "@esg/shared";

import { headcountOptions, industryOptions } from "@/data";

import { getServerEnv } from "../env";
import { LOGO_EXTENSIONS, detectImageType } from "./detect-image-type";

const REPORT_CODE_PATTERN = /^ESG-\d{8}-[A-Z0-9]{4}$/;
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const VIETNAM_OFFSET_MS = 7 * 60 * 60 * 1000;
const BRIDGE_TIMEOUT_MS = 30_000;
const CONSENT_YES = "Đồng ý";
const CONSENT_NO = "Chưa đồng ý";

export class CompanyInputError extends Error {
  readonly fields: Record<string, string>;

  constructor(message: string, fields: Record<string, string>) {
    super(message);
    this.name = "CompanyInputError";
    this.fields = fields;
  }
}

export class CompanyBridgeError extends Error {
  readonly kind: "not-configured" | "failed";

  constructor(message: string, kind: "not-configured" | "failed") {
    super(message);
    this.name = "CompanyBridgeError";
    this.kind = kind;
  }
}

interface BridgeLogo {
  name: string;
  mimeType: string;
  base64: string;
}

interface BridgeResponse {
  ok: boolean;
  error?: string;
  reportCode?: string;
  created?: boolean;
  missingColumns?: string[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseBridgeResponse(value: unknown): BridgeResponse | null {
  if (!isRecord(value) || typeof value["ok"] !== "boolean") {
    return null;
  }
  const missing = value["missingColumns"];
  return {
    ok: value["ok"],
    error: typeof value["error"] === "string" ? value["error"] : undefined,
    reportCode:
      typeof value["reportCode"] === "string" ? value["reportCode"] : undefined,
    created:
      typeof value["created"] === "boolean" ? value["created"] : undefined,
    missingColumns: Array.isArray(missing)
      ? missing.filter((item): item is string => typeof item === "string")
      : undefined,
  };
}

function readFields(form: FormData): Record<string, unknown> {
  const fields: Record<string, unknown> = {};
  for (const key of Object.keys(companyProfileSchema.shape)) {
    const raw = form.get(key);
    fields[key] = typeof raw === "string" ? raw : "";
  }
  const year = fields["reportYear"];
  fields["reportYear"] =
    typeof year === "string" && year.trim() !== "" ? Number(year) : undefined;
  return fields;
}

function createReportCode(): string {
  const date = new Date(Date.now() + VIETNAM_OFFSET_MS)
    .toISOString()
    .slice(0, 10)
    .replaceAll("-", "");
  let suffix = "";
  for (let index = 0; index < 4; index += 1) {
    suffix += CODE_ALPHABET.charAt(randomInt(CODE_ALPHABET.length));
  }
  return `ESG-${date}-${suffix}`;
}

function resolveReportCode(form: FormData): string {
  const provided = form.get("reportCode");
  return typeof provided === "string" && REPORT_CODE_PATTERN.test(provided)
    ? provided
    : createReportCode();
}

async function readLogo(form: FormData): Promise<BridgeLogo | null> {
  const file = form.get("logo");
  if (!(file instanceof File) || file.size === 0) {
    return null;
  }
  if (file.size > MAX_LOGO_SIZE_BYTES) {
    throw new CompanyInputError("Logo không được lớn hơn 2 MB.", {});
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = detectImageType(bytes);
  if (type === null) {
    throw new CompanyInputError("Logo phải là ảnh PNG, JPG hoặc WEBP.", {});
  }
  return {
    name: `logo.${LOGO_EXTENSIONS[type]}`,
    mimeType: type,
    base64: Buffer.from(bytes).toString("base64"),
  };
}

function findLabel(
  options: readonly { value: string; label: string }[],
  value: string,
): string {
  return options.find((option) => option.value === value)?.label ?? value;
}

function toSheetColumns(company: CompanyProfile): Record<string, string | number> {
  return {
    "Doanh nghiệp": company.name.trim(),
    "Mã số thuế": company.taxCode,
    "Lĩnh vực": findLabel(industryOptions, company.industry),
    "Quy mô nhân sự": findLabel(headcountOptions, company.headcount),
    "Địa chỉ": company.address.trim(),
    "Năm báo cáo": company.reportYear,
    "Kỳ báo cáo": REPORT_PERIOD_LABELS[company.reportPeriod],
    "Phạm vi báo cáo": company.reportScope.trim(),
    "Người liên hệ": company.contactName,
    Email: company.email,
    "Điện thoại": company.phone,
    "Nhu cầu tư vấn": company.advisoryNeed,
    "Nhu cầu thẩm định": company.assessmentNeed,
    "Đồng ý kết nối B2B": company.consentB2B === "yes" ? CONSENT_YES : CONSENT_NO,
    "Đồng ý tổng hợp dữ liệu":
      company.consentData === "yes" ? CONSENT_YES : CONSENT_NO,
  };
}

async function callBridge(
  url: string,
  payload: Record<string, unknown>,
): Promise<BridgeResponse> {
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
      signal: AbortSignal.timeout(BRIDGE_TIMEOUT_MS),
    });
  } catch {
    throw new CompanyBridgeError("Không kết nối được tới Google Apps Script.", "failed");
  }
  const text = await response.text();
  let parsed: BridgeResponse | null = null;
  try {
    parsed = parseBridgeResponse(JSON.parse(text));
  } catch {
    parsed = null;
  }
  if (!response.ok || parsed === null) {
    throw new CompanyBridgeError(
      `Apps Script trả về phản hồi không hợp lệ (HTTP ${response.status}).`,
      "failed",
    );
  }
  if (!parsed.ok) {
    throw new CompanyBridgeError(
      parsed.error ?? "Apps Script báo lỗi không rõ nguyên nhân.",
      "failed",
    );
  }
  return parsed;
}

export async function saveCompany(
  form: FormData,
): Promise<{ reportCode: string }> {
  const parsed = companyProfileSchema.safeParse(readFields(form));
  if (!parsed.success) {
    throw new CompanyInputError(
      "Dữ liệu chưa hợp lệ. Vui lòng kiểm tra lại các mục được đánh dấu.",
      flattenIssues(parsed.error),
    );
  }

  const env = getServerEnv();
  if (!env.GOOGLE_APPS_SCRIPT_URL || !env.GOOGLE_APPS_SCRIPT_SECRET) {
    throw new CompanyBridgeError(
      "Chưa cấu hình GOOGLE_APPS_SCRIPT_URL hoặc GOOGLE_APPS_SCRIPT_SECRET.",
      "not-configured",
    );
  }

  const reportCode = resolveReportCode(form);
  const logo = await readLogo(form);

  const result = await callBridge(env.GOOGLE_APPS_SCRIPT_URL, {
    secret: env.GOOGLE_APPS_SCRIPT_SECRET,
    action: "saveCompany",
    reportCode,
    fields: toSheetColumns(parsed.data),
    logo,
  });

  if (result.missingColumns && result.missingColumns.length > 0) {
    console.warn(
      `Data khách hàng thiếu cột: ${result.missingColumns.join(", ")}`,
    );
  }
  return { reportCode: result.reportCode ?? reportCode };
}
