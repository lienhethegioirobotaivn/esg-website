import { beforeAll, describe, expect, it } from "vitest";

import { loadFixtureTables, withCell, withoutTab } from "./question-bank-fixture.js";
import { parseQuestionBank } from "./parse-question-bank.js";
import { hasErrors, validateQuestionBank } from "./validate-question-bank.js";
import type { WorkbookTables } from "./xlsx-tables.js";

let tables: WorkbookTables;

beforeAll(async () => {
  tables = await loadFixtureTables();
});

function errorsOf(workbook: WorkbookTables): string[] {
  return validateQuestionBank(parseQuestionBank(workbook))
    .filter((issue) => issue.severity === "error")
    .map((issue) => `${issue.code ?? ""}: ${issue.message}`);
}

describe("đọc bộ câu hỏi v0.1", () => {
  it("nhập đủ 175 câu, 40 nhóm, không có lỗi", () => {
    const bank = parseQuestionBank(tables);

    expect(bank.questions).toHaveLength(175);
    expect(bank.groups).toHaveLength(40);
    expect(bank.version).toBe("0.1-draft");
    expect(hasErrors(validateQuestionBank(bank))).toBe(false);
  });

  it("chia theo track: 25 hồ sơ, 60 chung, 90 ngành; 173 đã duyệt, 2 chờ duyệt", () => {
    const bank = parseQuestionBank(tables);
    const count = (track: string) => bank.questions.filter((q) => q.track === track).length;

    expect([count("profile"), count("core"), count("sector")]).toEqual([25, 60, 90]);
    expect(bank.questions.filter((q) => q.reviewStatus === "pending").map((q) => q.code)).toEqual([
      "C-045",
      "ICT-002",
    ]);
  });

  it("giữ các kiểu nhập ngoài 8 kiểu của @esg/shared ở nhóm hồ sơ", () => {
    const bank = parseQuestionBank(tables);
    const profileTypes = new Set(bank.questions.filter((q) => q.track === "profile").map((q) => q.inputType));

    for (const type of ["CONSENT", "PERIOD", "SECTOR", "SECTORS", "SIZE", "LEVEL", "CAPABILITIES", "REVENUE"]) {
      expect(profileTypes.has(type)).toBe(true);
    }
    expect(
      bank.questions.filter((q) => q.track !== "profile").every((q) => !["CONSENT", "SIZE"].includes(q.inputType)),
    ).toBe(true);
  });

  it("route: ALL thành {}, câu ngành giữ điều kiện ngành và hoạt động", () => {
    const bank = parseQuestionBank(tables);
    const find = (code: string) => bank.questions.find((q) => q.code === code);

    expect(find("C-001")?.route).toEqual({});
    expect(find("MAN-001")?.route).toEqual({
      sector_any: ["MAN"],
      capability_any: ["machinery", "chemicals"],
    });
  });

  it("nạp quy tắc minh chứng tab 18 và ca kiểm thử tab 19", () => {
    const bank = parseQuestionBank(tables);
    const rule = bank.questions.find((q) => q.code === "C-002")?.evidenceRule;

    expect(rule).toMatchObject({ code: "EV-DATA", approval: "Chờ duyệt" });
    expect(rule?.["accepted"]).toBeTypeOf("string");
    expect(Array.isArray(rule?.["testCases"])).toBe(true);
    expect(bank.questions.every((q) => q.evidenceRule !== null)).toBe(true);
  });

  it("nhóm lưu có tối đa 5 câu và mã nhóm khớp save_group", () => {
    const bank = parseQuestionBank(tables);

    for (const group of bank.groups) {
      const members = bank.questions.filter((q) => q.saveGroup === group.code);
      expect(members.length).toBeGreaterThan(0);
      expect(members.length).toBeLessThanOrEqual(5);
    }
  });
});

describe("kiểm tra hợp lệ khi nhập", () => {
  it("báo thiếu tab", () => {
    expect(errorsOf(withoutTab(tables, "12 Logic cho Bình")).length).toBeGreaterThan(0);
  });

  it("báo mức khai báo sai", () => {
    const errors = errorsOf(withCell(tables, "02 Chung", 0, "Mức khai báo", "Trung bình"));

    expect(errors.some((e) => e.startsWith("C-001") && e.includes("Mức khai báo"))).toBe(true);
  });

  it("báo trạng thái duyệt lạ", () => {
    expect(errorsOf(withCell(tables, "02 Chung", 0, "Duyệt nội dung", "Nháp")).join("|")).toContain("C-001");
  });

  it("báo mã câu lặp giữa hai tab", () => {
    const errors = errorsOf(withCell(tables, "03 Sản xuất", 0, "Mã câu", "C-001"));

    expect(errors.some((e) => e.includes("lặp") || e.includes("Tiền tố"))).toBe(true);
  });

  it("báo kiểu nhập chưa hỗ trợ và kiểu hồ sơ dùng sai chỗ", () => {
    const unknown = errorsOf(withCell(tables, "12 Logic cho Bình", 25, "input_type", "RADIO"));
    const misplaced = errorsOf(withCell(tables, "12 Logic cho Bình", 25, "input_type", "CONSENT"));

    expect(unknown.some((e) => e.includes("RADIO"))).toBe(true);
    expect(misplaced.some((e) => e.includes("chỉ được dùng ở tab hồ sơ"))).toBe(true);
  });

  it("báo route sai dạng, sai ngành hoặc ALL ở tab ngành", () => {
    const logicIndex = (tables.tables.get("12 Logic cho Bình")?.rows ?? []).findIndex(
      (row) => row.cells["question_id"] === "MAN-001",
    );

    expect(errorsOf(withCell(tables, "12 Logic cho Bình", logicIndex, "route (OR)", "{oops"))).not.toEqual([]);
    expect(
      errorsOf(withCell(tables, "12 Logic cho Bình", logicIndex, "route (OR)", '{"sector_any":["RET"],"capability_any":[]}')),
    ).not.toEqual([]);
    expect(errorsOf(withCell(tables, "12 Logic cho Bình", logicIndex, "route (OR)", "ALL"))).not.toEqual([]);
  });

  it("báo order không hợp lệ hoặc trùng", () => {
    expect(errorsOf(withCell(tables, "12 Logic cho Bình", 0, "order", "0"))).not.toEqual([]);
    expect(errorsOf(withCell(tables, "12 Logic cho Bình", 1, "order", "1"))).not.toEqual([]);
  });

  it("báo nhóm lưu vượt 5 câu", () => {
    const errors = errorsOf(withCell(tables, "12 Logic cho Bình", 5, "save_group", "P-G01"));

    expect(errors.some((e) => e.includes("vượt giới hạn"))).toBe(true);
  });

  it("báo câu ở tab Logic không có nội dung và tab Logic ghi sai tab", () => {
    expect(errorsOf(withCell(tables, "12 Logic cho Bình", 0, "Tab nội dung", "02 Chung"))).not.toEqual([]);
    expect(errorsOf(withCell(tables, "02 Chung", 0, "Mã câu", "C-901")).join("|")).toContain("C-901");
  });

  it("báo content_version không thống nhất nhưng chấp nhận --version", () => {
    const mixed = withCell(tables, "12 Logic cho Bình", 0, "content_version", "0.2");

    expect(errorsOf(mixed).some((e) => e.includes("content_version"))).toBe(true);
    const forced = validateQuestionBank(parseQuestionBank(mixed, { version: "0.2" }));
    expect(hasErrors(forced)).toBe(false);
  });
});
