export const COMPANY_FIELDS = [
  "name",
  "industry",
  "headcount",
  "address",
  "reportYear",
  "reportScope",
] as const;

export type CompanyField = (typeof COMPANY_FIELDS)[number];
export type CompanyFormValues = Record<CompanyField, string>;

export const COMPANY_INITIAL_VALUES: CompanyFormValues = {
  name: "",
  industry: "",
  headcount: "",
  address: "",
  reportYear: "2026",
  reportScope: "",
};
