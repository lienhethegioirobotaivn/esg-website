import { z } from "zod";

import { REPORT_PERIODS } from "./report-period";

export const companyProfileSchema = z.object({
  name: z.string().min(1, "Vui lòng nhập tên doanh nghiệp"),
  industry: z.string().min(1, "Vui lòng chọn lĩnh vực hoạt động"),
  headcount: z.string().min(1, "Vui lòng chọn quy mô nhân sự"),
  address: z.string().min(1, "Vui lòng nhập địa chỉ trụ sở"),
  reportPeriod: z.enum(REPORT_PERIODS, { message: "Vui lòng chọn kỳ báo cáo" }),
  reportYear: z
    .number({ message: "Vui lòng chọn năm báo cáo" })
    .int("Năm báo cáo không hợp lệ")
    .min(2000, "Năm báo cáo không hợp lệ")
    .max(2100, "Năm báo cáo không hợp lệ"),
  reportScope: z.string(),
});

export type CompanyProfile = z.infer<typeof companyProfileSchema>;
