import { z } from "zod";

export const companyProfileSchema = z.object({
  name: z.string().min(1, "Vui lòng nhập tên doanh nghiệp"),
  industry: z.string().min(1, "Vui lòng chọn lĩnh vực hoạt động"),
  headcount: z.string().min(1, "Vui lòng chọn quy mô nhân sự"),
  address: z.string().min(1, "Vui lòng nhập địa chỉ trụ sở"),
  reportYear: z.number().int().min(2000).max(2100),
  reportScope: z.string(),
});

export type CompanyProfile = z.infer<typeof companyProfileSchema>;
