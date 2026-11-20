import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { groupMyReports, myReportListSchema } from "../src/my-reports";
import type { MyReport } from "../src/my-reports";

function report(overrides: Partial<MyReport>): MyReport {
  return {
    exportId: "RX-20261118-AAAAAA",
    reportCode: "ESG-20261118-AB12",
    time: "2026-11-18 10:00:00",
    locale: "vi",
    status: "complete",
    company: "ABC",
    theme: "default",
    pdf: true,
    docx: true,
    ...overrides,
  };
}

describe("my reports", () => {
  it("accepts a list from the bridge and rejects a bad export id", () => {
    assert.equal(myReportListSchema.safeParse({ reports: [report({})] }).success, true);
    assert.equal(
      myReportListSchema.safeParse({ reports: [report({ exportId: "x" })] }).success,
      false,
    );
  });

  it("groups by report code, newest first, using the first named company", () => {
    const groups = groupMyReports([
      report({ exportId: "RX-20261118-AAAAAA", time: "2026-11-18 10:00:00", company: "" }),
      report({ exportId: "RX-20261118-BBBBBB", time: "2026-11-18 12:00:00", company: "ABC" }),
      report({
        exportId: "RX-20261119-CCCCCC",
        reportCode: "ESG-20261119-ZZ99",
        time: "2026-11-19 09:00:00",
        company: "XYZ",
      }),
    ]);
    assert.deepEqual(groups.map((group) => group.reportCode), [
      "ESG-20261119-ZZ99",
      "ESG-20261118-AB12",
    ]);
    const first = groups[1];
    assert.ok(first);
    assert.equal(first.company, "ABC");
    assert.deepEqual(first.reports.map((item) => item.exportId), [
      "RX-20261118-BBBBBB",
      "RX-20261118-AAAAAA",
    ]);
  });
});
