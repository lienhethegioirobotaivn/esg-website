import { describe, expect, it } from "vitest";

import { AppError } from "../common/app-error.js";
import { parseCompanyForm, toCompanyColumns } from "./company-mapper.js";

const valid = {
  name: "  Công ty ABC ",
  industry: "manufacturing",
  headcount: "50-199",
  address: "1 Lê Lợi, Hà Nội",
  reportPeriod: "full_year",
  reportYear: "2025",
  reportScope: "",
  taxCode: " 0100000000 ",
  contactName: "",
  email: "abc@example.com",
  phone: "",
  advisoryNeed: "",
  assessmentNeed: "",
  consentB2B: "yes",
  consentData: "",
};

describe("parseCompanyForm", () => {
  it("đọc các trường dạng chuỗi và ép năm báo cáo thành số", () => {
    const input = parseCompanyForm({ ...valid, reportCode: "ESG-20260101-ABCD" });
    expect(input.profile.reportYear).toBe(2025);
    expect(input.reportCode).toBe("ESG-20260101-ABCD");
  });

  it("bỏ qua mã báo cáo sai định dạng", () => {
    expect(parseCompanyForm({ ...valid, reportCode: "abc" }).reportCode).toBeNull();
    expect(parseCompanyForm(valid).reportCode).toBeNull();
  });

  it("từ chối thiếu trường bắt buộc, ngành hoặc quy mô lạ, năm không hợp lệ", () => {
    expect(() => parseCompanyForm({ ...valid, name: "" })).toThrow(AppError);
    expect(() => parseCompanyForm({ ...valid, industry: "khac" })).toThrow(AppError);
    expect(() => parseCompanyForm({ ...valid, headcount: "1000" })).toThrow(AppError);
    expect(() => parseCompanyForm({ ...valid, reportYear: "" })).toThrow(AppError);
    expect(() => parseCompanyForm({ ...valid, email: "không phải email" })).toThrow(AppError);
    expect(() => parseCompanyForm(null)).toThrow(AppError);
  });
});

describe("toCompanyColumns", () => {
  it("ánh xạ ngành sang mã nguồn câu hỏi, chuỗi rỗng sang null và gom phần còn lại vào profile", () => {
    const columns = toCompanyColumns(parseCompanyForm(valid).profile);
    expect(columns).toMatchObject({
      legalName: "Công ty ABC",
      taxCode: "0100000000",
      primarySector: "MAN",
      headcountTier: "50-199",
      contactName: null,
      contactEmail: "abc@example.com",
      contactPhone: null,
    });
    expect(columns.profile).toMatchObject({ reportYear: 2025, reportPeriod: "full_year", industry: "manufacturing" });
  });
});
