import { z } from "zod";

import {
  ADVISORY_NEEDS,
  ASSESSMENT_NEEDS,
  CONSENT_VALUES,
} from "./constants";
import { REPORT_PERIODS } from "./report-period";
import { msg } from "./i18n";

const emailSchema = z
  .string()
  .trim()
  .max(120, msg("Email tối đa 120 ký tự"))
  .refine((value) => value === "" || z.email().safeParse(value).success, {
    message: msg("Email không hợp lệ"),
  });

const phoneSchema = z
  .string()
  .trim()
  .refine((value) => value === "" || /^[0-9+()\-.\s]{8,20}$/.test(value), {
    message: msg("Số điện thoại không hợp lệ"),
  });

export const companyProfileSchema = z.object({
  name: z.string().min(1, msg("Vui lòng nhập tên doanh nghiệp")),
  industry: z.string().min(1, msg("Vui lòng chọn lĩnh vực hoạt động")),
  headcount: z.string().min(1, msg("Vui lòng chọn quy mô nhân sự")),
  address: z.string().min(1, msg("Vui lòng nhập địa chỉ trụ sở")),
  reportPeriod: z.enum(REPORT_PERIODS, { message: msg("Vui lòng chọn kỳ báo cáo") }),
  reportYear: z
    .number({ message: msg("Vui lòng chọn năm báo cáo") })
    .int(msg("Năm báo cáo không hợp lệ"))
    .min(2000, msg("Năm báo cáo không hợp lệ"))
    .max(2100, msg("Năm báo cáo không hợp lệ")),
  reportScope: z.string(),
  taxCode: z.string().trim().max(30, msg("Mã số thuế tối đa 30 ký tự")),
  contactName: z.string().trim().max(100, msg("Tên người liên hệ tối đa 100 ký tự")),
  email: emailSchema,
  phone: phoneSchema,
  advisoryNeed: z.enum(["", ...ADVISORY_NEEDS], {
    message: msg("Nhu cầu tư vấn không hợp lệ"),
  }),
  assessmentNeed: z.enum(["", ...ASSESSMENT_NEEDS], {
    message: msg("Nhu cầu thẩm định không hợp lệ"),
  }),
  consentB2B: z.enum(CONSENT_VALUES),
  consentData: z.enum(CONSENT_VALUES),
});

export type CompanyProfile = z.infer<typeof companyProfileSchema>;
