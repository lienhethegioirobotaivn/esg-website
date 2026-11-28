import {
  BANK_AI_CASE_FIELDS,
  BANK_AI_EXPECTED_OPTIONS,
  BANK_AI_TEST_STATUS_OPTIONS,
  BANK_EVIDENCE_APPLY_OPTIONS,
  BANK_EVIDENCE_FIELDS,
  BANK_REVIEW_LABELS,
  BANK_ROLLOUT_LABELS,
  type BankEvidenceRule,
} from "@esg/shared/node";
import ExcelJS from "exceljs";

import {
  AI_CASES_TAB_NAME,
  BANK_TABS,
  BASIC_LABEL,
  EVIDENCE_TAB_NAME,
  EXTENDED_LABEL,
  LOGIC_TAB_NAME,
  OPTIONAL_LABEL,
  REQUIRED_LABEL,
  ROUTE_ALL,
} from "./question-bank.constants.js";
import type { ParsedBank, ParsedQuestion } from "./question-bank.types.js";

const CONTENT_COLUMNS: ReadonlyArray<readonly [string, number]> = [
  ["Mã câu", 12],
  ["Chủ đề", 24],
  ["Câu hỏi hiển thị", 60],
  ["Nhân · góp ý / cần sửa", 30],
  ["Duyệt nội dung", 16],
  ["Hướng dẫn điền", 50],
  ["Bằng chứng gợi ý", 40],
  ["Mức khai báo", 14],
  ["Gợi ý cải thiện ban đầu", 45],
  ["Mã nguồn", 12],
  ["Người duyệt", 18],
  ["Ngày duyệt", 14],
];

const LOGIC_COLUMNS: ReadonlyArray<readonly [string, number]> = [
  ["question_id", 12],
  ["Tab nội dung", 28],
  ["Dòng nguồn · theo ID", 12],
  ["save_group", 12],
  ["order", 8],
  ["input_type", 18],
  ["option_set_id", 18],
  ["unit", 10],
  ["route (OR)", 50],
  ["tier · liên kết", 14],
  ["review · liên kết", 16],
  ["Bắt buộc trả lời", 16],
  ["evidence_rule", 16],
  ["report_section", 16],
  ["content_version", 16],
  ["Triển khai", 18],
  ["validation_rule", 18],
];

const AI_CASE_ORDER = [
  "id",
  "code",
  "scenario",
  "input",
  "expected",
  "needsReview",
  "basis",
  "forbidden",
  "result",
  "testStatus",
  "model",
  "durationMs",
  "costUsd",
  "approval",
  "note",
  "runDate",
  "fileStatus",
  "ruleVersion",
] as const;

const REVIEW_LIST = Object.values(BANK_REVIEW_LABELS);
const EXPORT_BLANK_ROWS = 50;

function addSheet(
  workbook: ExcelJS.Workbook,
  name: string,
  columns: ReadonlyArray<readonly [string, number]>,
  rows: readonly (readonly string[])[],
  lists: Readonly<Record<string, readonly string[]>>,
): void {
  const sheet = workbook.addWorksheet(name, { views: [{ state: "frozen", ySplit: 1, xSplit: 1 }] });
  sheet.columns = columns.map(([header, width]) => ({
    header,
    width,
    style: { alignment: { wrapText: true, vertical: "top" } },
  }));
  sheet.getRow(1).font = { bold: true };
  for (const row of rows) {
    sheet.addRow([...row]);
  }
  columns.forEach(([header], index) => {
    const options = lists[header];
    if (options === undefined) {
      return;
    }
    for (let row = 2; row <= rows.length + 1 + EXPORT_BLANK_ROWS; row += 1) {
      sheet.getCell(row, index + 1).dataValidation = {
        type: "list",
        allowBlank: true,
        formulae: [`"${options.join(",")}"`],
      };
    }
  });
}

function ruleOf(question: ParsedQuestion): BankEvidenceRule {
  return (question.evidenceRule ?? { code: "EV-OPTIONAL" }) as unknown as BankEvidenceRule;
}

export async function writeBankWorkbook(bank: ParsedBank): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const tier = (question: ParsedQuestion): string =>
    question.declarationLevel === "extended" ? EXTENDED_LABEL : BASIC_LABEL;
  const ordered: ParsedQuestion[] = [];
  const rowNumbers = new Map<string, number>();

  for (const tab of BANK_TABS) {
    const own = bank.questions
      .filter((question) => question.source === tab.source)
      .sort((a, b) => a.position - b.position);
    own.forEach((question, index) => rowNumbers.set(question.code, index + 2));
    ordered.push(...own);
    addSheet(
      workbook,
      tab.tabName,
      CONTENT_COLUMNS,
      own.map((question) => [
        question.code,
        question.pillar === null ? question.topic : `${question.pillar} · ${question.topic}`,
        question.text,
        question.reviewNote ?? "",
        BANK_REVIEW_LABELS[question.reviewStatus],
        question.guidance ?? "",
        question.evidenceHint ?? "",
        tier(question),
        question.improvementHint ?? "",
        question.sourceRef ?? "",
        question.reviewedBy ?? "",
        question.reviewedOn ?? "",
      ]),
      { "Duyệt nội dung": REVIEW_LIST, "Mức khai báo": [BASIC_LABEL, EXTENDED_LABEL] },
    );
  }

  addSheet(
    workbook,
    LOGIC_TAB_NAME,
    LOGIC_COLUMNS,
    ordered.map((question) => [
      question.code,
      question.tabName,
      String(rowNumbers.get(question.code) ?? ""),
      question.saveGroup,
      String(question.position),
      question.inputType,
      question.inputType,
      question.unit ?? "",
      Object.keys(question.route).length === 0 ? ROUTE_ALL : JSON.stringify(question.route),
      tier(question),
      BANK_REVIEW_LABELS[question.reviewStatus],
      question.required ? REQUIRED_LABEL : OPTIONAL_LABEL,
      ruleOf(question).code,
      question.reportSection ?? "",
      bank.version ?? "",
      BANK_ROLLOUT_LABELS[question.rolloutStatus],
      question.inputType,
    ]),
    {
      "Bắt buộc trả lời": [REQUIRED_LABEL, OPTIONAL_LABEL],
      "Triển khai": Object.values(BANK_ROLLOUT_LABELS),
    },
  );

  const evidenceColumns: ReadonlyArray<readonly [string, number]> = [
    ["Mã câu", 12],
    ["Câu hỏi · liên kết", 45],
    ...BANK_EVIDENCE_FIELDS.map(([, header]) => [header, 30] as const),
    ["Tab nguồn", 28],
  ];
  addSheet(
    workbook,
    EVIDENCE_TAB_NAME,
    evidenceColumns,
    ordered
      .filter((question) => BANK_EVIDENCE_FIELDS.some(([key]) => (ruleOf(question)[key] ?? "") !== ""))
      .map((question) => [
        question.code,
        question.text,
        ...BANK_EVIDENCE_FIELDS.map(([key]) => ruleOf(question)[key] ?? ""),
        question.tabName,
      ]),
    { "Duyệt quy tắc": REVIEW_LIST, "Cách áp dụng": BANK_EVIDENCE_APPLY_OPTIONS },
  );

  const caseHeaders = new Map<string, string>(BANK_AI_CASE_FIELDS.map(([key, header]) => [key, header]));
  caseHeaders.set("code", "Mã câu");
  const cases = ordered.flatMap((question) =>
    (ruleOf(question).testCases ?? []).map((testCase) => ({ ...testCase, code: question.code })),
  );
  cases.sort((a, b) => (a.id ?? "").localeCompare(b.id ?? "", "en", { numeric: true }));
  addSheet(
    workbook,
    AI_CASES_TAB_NAME,
    AI_CASE_ORDER.map((key) => [caseHeaders.get(key) ?? key, 24] as const),
    cases.map((testCase) => AI_CASE_ORDER.map((key) => testCase[key] ?? "")),
    {
      "Đầu ra mong đợi": BANK_AI_EXPECTED_OPTIONS,
      "Kiểm thử": BANK_AI_TEST_STATUS_OPTIONS,
      "Duyệt ca mẫu": REVIEW_LIST,
      "Cần người duyệt?": [REQUIRED_LABEL, OPTIONAL_LABEL],
    },
  );

  return Buffer.from(await workbook.xlsx.writeBuffer());
}
