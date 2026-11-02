import { COMPANY_FIELDS } from "../constants";
import type { CompanyField, CompanyFormValues } from "../constants";

export class SaveCompanyError extends Error {
  readonly fields: Partial<Record<CompanyField, string>>;

  constructor(
    message: string,
    fields: Partial<Record<CompanyField, string>> = {},
  ) {
    super(message);
    this.name = "SaveCompanyError";
    this.fields = fields;
  }
}

interface SaveCompanyInput {
  values: CompanyFormValues;
  logo: File | null;
  reportCode: string | null;
}

interface SaveCompanyResult {
  reportCode: string;
}

const GENERIC_ERROR =
  "Không lưu được thông tin doanh nghiệp. Vui lòng thử lại sau.";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readErrorFields(
  source: unknown,
): Partial<Record<CompanyField, string>> {
  const fields: Partial<Record<CompanyField, string>> = {};
  if (!isRecord(source)) {
    return fields;
  }
  for (const field of COMPANY_FIELDS) {
    const message = source[field];
    if (typeof message === "string") {
      fields[field] = message;
    }
  }
  return fields;
}

export async function saveCompany({
  values,
  logo,
  reportCode,
}: SaveCompanyInput): Promise<SaveCompanyResult> {
  const body = new FormData();
  for (const field of COMPANY_FIELDS) {
    body.append(field, values[field]);
  }
  if (reportCode !== null) {
    body.append("reportCode", reportCode);
  }
  if (logo !== null) {
    body.append("logo", logo);
  }

  let response: Response;
  try {
    response = await fetch("/api/company", { method: "POST", body });
  } catch {
    throw new SaveCompanyError(GENERIC_ERROR);
  }

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const error = isRecord(payload) ? payload["error"] : null;
    const message =
      isRecord(error) && typeof error["message"] === "string"
        ? error["message"]
        : GENERIC_ERROR;
    throw new SaveCompanyError(
      message,
      isRecord(error) ? readErrorFields(error["fields"]) : {},
    );
  }

  const code = isRecord(payload) ? payload["reportCode"] : null;
  if (typeof code !== "string") {
    throw new SaveCompanyError(GENERIC_ERROR);
  }
  return { reportCode: code };
}
