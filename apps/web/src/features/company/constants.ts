import type { ReportPeriod } from "@esg/shared";

export const COMPANY_FIELDS = [
  "name",
  "industry",
  "headcount",
  "address",
  "reportPeriod",
  "reportYear",
  "reportScope",
] as const;

export type CompanyField = (typeof COMPANY_FIELDS)[number];
export type CompanyFormValues = Record<CompanyField, string>;

export const REPORT_PERIOD_OPTIONS = [
  { value: "q1", label: "Quý 1" },
  { value: "q2", label: "Quý 2" },
  { value: "q3", label: "Quý 3" },
  { value: "q4", label: "Quý 4" },
  { value: "full_year", label: "Cả năm" },
] as const satisfies readonly { value: ReportPeriod; label: string }[];

const CURRENT_YEAR = new Date().getFullYear();

export const COMPANY_INITIAL_VALUES: CompanyFormValues = {
  name: "",
  industry: "",
  headcount: "",
  address: "",
  reportPeriod: "",
  reportYear: String(CURRENT_YEAR),
  reportScope: "",
};
