import { REPORT_PERIODS, REPORT_PERIOD_LABELS } from "@esg/shared";

export const COMPANY_FIELDS = [
  "name",
  "taxCode",
  "industry",
  "headcount",
  "address",
  "reportPeriod",
  "reportYear",
  "reportScope",
  "contactName",
  "email",
  "phone",
  "advisoryNeed",
  "assessmentNeed",
  "consentB2B",
  "consentData",
] as const;

export type CompanyField = (typeof COMPANY_FIELDS)[number];
export type CompanyFormValues = Record<CompanyField, string>;

export const COMPANY_FIELD_LABELS: Record<CompanyField, string> = {
  name: "Tên doanh nghiệp",
  taxCode: "Mã số thuế",
  industry: "Lĩnh vực hoạt động",
  headcount: "Quy mô nhân sự",
  address: "Địa chỉ trụ sở",
  reportPeriod: "Kỳ báo cáo",
  reportYear: "Năm báo cáo",
  reportScope: "Phạm vi báo cáo ESG",
  contactName: "Người liên hệ",
  email: "Email",
  phone: "Số điện thoại",
  advisoryNeed: "Nhu cầu tư vấn",
  assessmentNeed: "Nhu cầu thẩm định",
  consentB2B: "Đồng ý kết nối đối tác",
  consentData: "Đồng ý tổng hợp dữ liệu",
};

export const COMPANY_FIELD_IDS: Record<CompanyField, string> = {
  name: "company-name",
  taxCode: "company-tax-code",
  industry: "company-industry",
  headcount: "company-headcount",
  address: "company-address",
  reportPeriod: "company-report-period",
  reportYear: "company-report-year",
  reportScope: "company-report-scope",
  contactName: "company-contact-name",
  email: "company-email",
  phone: "company-phone",
  advisoryNeed: "company-advisory-need",
  assessmentNeed: "company-assessment-need",
  consentB2B: "company-consent-b2b",
  consentData: "company-consent-data",
};

export const REPORT_PERIOD_OPTIONS = REPORT_PERIODS.map((value) => ({
  value,
  label: REPORT_PERIOD_LABELS[value],
}));

const CURRENT_YEAR = new Date().getFullYear();

export const COMPANY_INITIAL_VALUES: CompanyFormValues = {
  name: "",
  taxCode: "",
  industry: "",
  headcount: "",
  address: "",
  reportPeriod: "",
  reportYear: String(CURRENT_YEAR),
  reportScope: "",
  contactName: "",
  email: "",
  phone: "",
  advisoryNeed: "",
  assessmentNeed: "",
  consentB2B: "",
  consentData: "",
};
