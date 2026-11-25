import { EXPORT_ID_PATTERN, REPORT_CODE_PATTERN } from "@esg/shared/node";
import { describe, expect, it } from "vitest";

import { generateExportId, generateReportCode } from "./report-code.js";

describe("mã báo cáo và mã bản xuất", () => {
  it("đúng định dạng của @esg/shared", () => {
    for (let index = 0; index < 50; index += 1) {
      expect(generateReportCode()).toMatch(REPORT_CODE_PATTERN);
      expect(generateExportId()).toMatch(EXPORT_ID_PATTERN);
    }
  });

  it("lấy ngày theo giờ Việt Nam (UTC+7)", () => {
    const lateUtc = Date.UTC(2026, 0, 31, 20, 0, 0);
    expect(generateReportCode(lateUtc)).toMatch(/^ESG-20260201-/);
    expect(generateExportId(lateUtc)).toMatch(/^RX-20260201-/);
  });
});
