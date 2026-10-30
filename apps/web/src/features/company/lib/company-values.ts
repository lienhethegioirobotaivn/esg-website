import { COMPANY_FIELDS, COMPANY_INITIAL_VALUES } from "../constants";
import type { CompanyField, CompanyFormValues } from "../constants";

export function isCompanyField(key: PropertyKey): key is CompanyField {
  return COMPANY_FIELDS.some((field) => field === key);
}

export function pickCompanyValues(
  source: Readonly<Record<string, string>>,
): CompanyFormValues {
  const result: CompanyFormValues = { ...COMPANY_INITIAL_VALUES };
  for (const field of COMPANY_FIELDS) {
    const value = source[field];
    if (value !== undefined) {
      result[field] = value;
    }
  }
  return result;
}
