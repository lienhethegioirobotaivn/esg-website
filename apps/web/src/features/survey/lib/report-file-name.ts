import { REPORT_PERIOD_OPTIONS } from "@/features/company";
import type { CompanyFormValues } from "@/features/company";

export function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function buildReportFileName(company: CompanyFormValues): string {
  const periodLabel =
    REPORT_PERIOD_OPTIONS.find((option) => option.value === company.reportPeriod)
      ?.label ?? company.reportPeriod;
  const parts = [
    "bao-cao-esg",
    slugify(company.name),
    slugify(periodLabel),
    slugify(company.reportYear),
  ].filter((part) => part.length > 0);
  return `${parts.join("-")}.pdf`;
}
