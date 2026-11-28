import {
  BANK_AI_CASE_FIELDS,
  BANK_EVIDENCE_FIELDS,
  BANK_REVIEW_LABELS,
  BANK_REVIEW_STATUSES,
  BANK_ROLLOUT_LABELS,
  BANK_ROLLOUT_STATUSES,
  INPUT_TYPES,
} from "@esg/shared/node";
import { z } from "zod";

import {
  QUESTION_PILLARS,
  SECTOR_CODES,
  type QuestionPillar,
  type QuestionReviewStatus,
  type QuestionRolloutStatus,
  type QuestionTier,
} from "../database/schema/index.js";
import {
  AI_CASES_FIRST_HEADER,
  AI_CASES_TAB_NAME,
  BANK_TABS,
  BASIC_LABEL,
  CONTENT_FIRST_HEADER,
  EVIDENCE_RULE_CODES,
  EVIDENCE_TAB_NAME,
  EXTENDED_LABEL,
  LOGIC_FIRST_HEADER,
  LOGIC_TAB_NAME,
  OPTIONAL_LABEL,
  PROFILE_EXTRA_INPUT_TYPES,
  QUESTION_CODE_PATTERN,
  REQUIRED_LABEL,
  ROUTE_ALL,
  type BankTab,
} from "./question-bank.constants.js";
import type {
  ImportIssue,
  ParsedBank,
  ParsedGroup,
  ParsedQuestion,
} from "./question-bank.types.js";
import { normalizeSheetDate } from "./sheet-date.js";
import type { SheetRow, SheetTable, WorkbookTables } from "./xlsx-tables.js";

export interface ParseOptions {
  readonly version?: string;
}

const ALL_INPUT_TYPES: readonly string[] = [...INPUT_TYPES, ...PROFILE_EXTRA_INPUT_TYPES];

const routeSchema = z
  .object({
    sector_any: z.array(z.enum(SECTOR_CODES)),
    capability_any: z.array(z.string().min(1)),
  })
  .strict();

export function readerRequests() {
  return [
    ...BANK_TABS.map((tab) => ({ tabName: tab.tabName, firstHeader: CONTENT_FIRST_HEADER })),
    { tabName: LOGIC_TAB_NAME, firstHeader: LOGIC_FIRST_HEADER },
    { tabName: EVIDENCE_TAB_NAME, firstHeader: CONTENT_FIRST_HEADER },
    { tabName: AI_CASES_TAB_NAME, firstHeader: AI_CASES_FIRST_HEADER },
  ];
}

function cell(row: SheetRow, header: string): string {
  return row.cells[header] ?? "";
}

function orNull(value: string): string | null {
  return value === "" ? null : value;
}

function parseTopic(
  rawTopic: string,
  tab: BankTab,
): { pillar: QuestionPillar | null; topic: string; guessed: boolean } {
  if (tab.track === "profile") {
    return { pillar: null, topic: rawTopic.trim(), guessed: false };
  }
  const separator = rawTopic.indexOf("·");
  if (separator < 0) {
    return { pillar: "G", topic: rawTopic.trim(), guessed: true };
  }
  const prefix = rawTopic.slice(0, separator).trim().toUpperCase();
  const pillar = QUESTION_PILLARS.find((candidate) => candidate === prefix);
  if (pillar !== undefined) {
    return { pillar, topic: rawTopic.slice(separator + 1).trim(), guessed: false };
  }
  return { pillar: "G", topic: rawTopic.replace("·", "-").trim(), guessed: true };
}

interface LogicEntry {
  readonly row: SheetRow;
  readonly tabName: string;
}

export function parseQuestionBank(workbook: WorkbookTables, options: ParseOptions = {}): ParsedBank {
  const issues: ImportIssue[] = [];
  const report = (
    severity: ImportIssue["severity"],
    tab: string,
    row: SheetRow | null,
    code: string | null,
    message: string,
  ): void => {
    issues.push({ severity, tab, row: row?.rowNumber ?? null, code, message });
  };

  for (const tabName of workbook.missingTabs) {
    report("error", tabName, null, null, "Không tìm thấy tab này trong file xlsx.");
  }
  for (const tabName of workbook.missingHeaders) {
    report("error", tabName, null, null, "Không tìm thấy dòng tiêu đề của tab này.");
  }

  const logic = new Map<string, LogicEntry>();
  const logicTable = workbook.tables.get(LOGIC_TAB_NAME);
  const versions = new Set<string>();
  if (logicTable !== undefined) {
    for (const row of logicTable.rows) {
      const code = cell(row, "question_id");
      if (code === "") {
        continue;
      }
      if (logic.has(code)) {
        report("error", LOGIC_TAB_NAME, row, code, "Mã câu bị lặp trong tab Logic.");
        continue;
      }
      logic.set(code, { row, tabName: cell(row, "Tab nội dung") });
      const version = cell(row, "content_version");
      if (version !== "") {
        versions.add(version);
      }
    }
  }

  const evidence = readEvidenceTable(workbook.tables.get(EVIDENCE_TAB_NAME), report);
  const aiCases = readAiCases(workbook.tables.get(AI_CASES_TAB_NAME));

  const questions: ParsedQuestion[] = [];
  const seen = new Map<string, string>();

  for (const tab of BANK_TABS) {
    const table = workbook.tables.get(tab.tabName);
    if (table === undefined) {
      continue;
    }
    for (const row of table.rows) {
      const code = cell(row, CONTENT_FIRST_HEADER);
      if (code === "") {
        continue;
      }
      const parsed = parseQuestionRow({ tab, row, code, logic, evidence, aiCases, seen, report });
      if (parsed !== null) {
        questions.push(parsed);
      }
    }
  }

  for (const [code, entry] of logic) {
    if (!seen.has(code)) {
      report(
        "error",
        LOGIC_TAB_NAME,
        entry.row,
        code,
        `Có trong tab Logic nhưng không có ở tab nội dung "${entry.tabName}".`,
      );
    }
  }

  const known = new Set(questions.map((question) => question.code));
  for (const [code, rule] of evidence) {
    if (!known.has(code)) {
      report("warning", EVIDENCE_TAB_NAME, rule.row, code, "Quy tắc minh chứng cho một mã câu không tồn tại.");
    }
  }

  let version: string | null = options.version ?? null;
  if (version === null) {
    if (versions.size === 1) {
      version = [...versions][0] ?? null;
    } else if (versions.size === 0) {
      report("error", LOGIC_TAB_NAME, null, null, "Không có cột content_version nào có giá trị; hãy truyền --version.");
    } else {
      report(
        "error",
        LOGIC_TAB_NAME,
        null,
        null,
        `content_version không thống nhất (${[...versions].join(", ")}); hãy sửa file hoặc truyền --version.`,
      );
    }
  }

  return { version, groups: buildGroups(questions), questions, issues };
}

interface RowContext {
  readonly tab: BankTab;
  readonly row: SheetRow;
  readonly code: string;
  readonly logic: ReadonlyMap<string, LogicEntry>;
  readonly evidence: ReadonlyMap<string, EvidenceEntry>;
  readonly aiCases: ReadonlyMap<string, Record<string, string>[]>;
  readonly seen: Map<string, string>;
  readonly report: (
    severity: ImportIssue["severity"],
    tab: string,
    row: SheetRow | null,
    code: string | null,
    message: string,
  ) => void;
}

function parseQuestionRow(context: RowContext): ParsedQuestion | null {
  const { tab, row, code, logic, evidence, aiCases, seen, report } = context;
  const fail = (message: string): void => report("error", tab.tabName, row, code, message);
  let valid = true;
  const reject = (message: string): void => {
    valid = false;
    fail(message);
  };

  if (!QUESTION_CODE_PATTERN.test(code)) {
    reject("Mã câu không đúng dạng P-001, C-001 hoặc MAN-001.");
  } else {
    const prefix = code.slice(0, code.indexOf("-"));
    const expected = tab.source === "PROFILE" ? "P" : tab.source === "COMMON" ? "C" : tab.source;
    if (prefix !== expected) {
      reject(`Tiền tố mã câu phải là ${expected} ở tab này.`);
    }
  }
  const previousTab = seen.get(code);
  if (previousTab !== undefined) {
    reject(`Mã câu bị lặp (đã có ở tab "${previousTab}").`);
    return null;
  }
  seen.set(code, tab.tabName);

  const text = cell(row, "Câu hỏi hiển thị");
  if (text === "") {
    reject("Thiếu nội dung câu hỏi hiển thị.");
  }

  const reviewLabel = cell(row, "Duyệt nội dung");
  const matchedStatus = BANK_REVIEW_STATUSES.find(
    (status) => BANK_REVIEW_LABELS[status] === reviewLabel,
  );
  const reviewStatus: QuestionReviewStatus = matchedStatus ?? "pending";
  if (matchedStatus === undefined) {
    const allowed = BANK_REVIEW_STATUSES.map((status) => `"${BANK_REVIEW_LABELS[status]}"`).join(", ");
    reject(`Trạng thái duyệt phải là một trong ${allowed}; đang là "${reviewLabel}".`);
  }

  const reviewedOnText = cell(row, "Ngày duyệt");
  const reviewedOn = normalizeSheetDate(reviewedOnText);
  if (reviewedOnText !== "" && reviewedOn === null) {
    report("warning", tab.tabName, row, code, `Không đọc được ngày duyệt "${reviewedOnText}", đã để trống.`);
  }

  const tierLabel = cell(row, "Mức khai báo");
  let declarationLevel: QuestionTier = "basic";
  if (tierLabel === EXTENDED_LABEL) {
    declarationLevel = "extended";
  } else if (tierLabel !== BASIC_LABEL) {
    reject(`Mức khai báo phải là "${BASIC_LABEL}" hoặc "${EXTENDED_LABEL}", đang là "${tierLabel}".`);
  }

  const { pillar, topic, guessed } = parseTopic(cell(row, "Chủ đề"), tab);
  if (guessed) {
    report("warning", tab.tabName, row, code, "Chủ đề không bắt đầu bằng E/S/G · nên được xếp vào nhóm Quản trị (G).");
  }

  const entry = logic.get(code);
  if (entry === undefined) {
    reject("Không có dòng tương ứng ở tab Logic.");
    return null;
  }
  if (entry.tabName !== tab.tabName) {
    reject(`Tab Logic ghi câu này thuộc "${entry.tabName}", nhưng nó nằm ở "${tab.tabName}".`);
  }
  const logicRow = entry.row;
  const logicFail = (message: string): void => {
    valid = false;
    report("error", LOGIC_TAB_NAME, logicRow, code, message);
  };

  const inputType = cell(logicRow, "input_type");
  if (!ALL_INPUT_TYPES.includes(inputType)) {
    logicFail(`Kiểu nhập "${inputType}" chưa được hỗ trợ.`);
  } else if (tab.track !== "profile" && !INPUT_TYPES.some((type) => type === inputType)) {
    logicFail(`Kiểu nhập "${inputType}" chỉ được dùng ở tab hồ sơ.`);
  }
  for (const header of ["option_set_id", "validation_rule"]) {
    const value = cell(logicRow, header);
    if (value !== "" && value !== inputType) {
      report("warning", LOGIC_TAB_NAME, logicRow, code, `${header} ("${value}") khác input_type ("${inputType}").`);
    }
  }

  const requiredLabel = cell(logicRow, "Bắt buộc trả lời");
  if (requiredLabel !== REQUIRED_LABEL && requiredLabel !== OPTIONAL_LABEL) {
    logicFail(`"Bắt buộc trả lời" phải là "${REQUIRED_LABEL}" hoặc "${OPTIONAL_LABEL}", đang là "${requiredLabel}".`);
  }

  const evidenceCode = cell(logicRow, "evidence_rule");
  if (!EVIDENCE_RULE_CODES.some((candidate) => candidate === evidenceCode)) {
    logicFail(`evidence_rule "${evidenceCode}" không nằm trong ${EVIDENCE_RULE_CODES.join(", ")}.`);
  }

  const saveGroup = cell(logicRow, "save_group");
  if (saveGroup === "") {
    logicFail("Thiếu save_group.");
  }

  const positionText = cell(logicRow, "order");
  const position = Number(positionText);
  if (!Number.isInteger(position) || position < 1) {
    logicFail(`order phải là số nguyên dương, đang là "${positionText}".`);
  }

  const route = parseRoute(cell(logicRow, "route (OR)"), tab, (message) => logicFail(message));

  const rolloutLabel = cell(logicRow, "Triển khai");
  const matchedRollout = BANK_ROLLOUT_STATUSES.find(
    (status) => BANK_ROLLOUT_LABELS[status] === rolloutLabel,
  );
  const rolloutStatus: QuestionRolloutStatus = matchedRollout ?? "not_started";
  if (rolloutLabel !== "" && matchedRollout === undefined) {
    report("warning", LOGIC_TAB_NAME, logicRow, code, `Không hiểu trạng thái triển khai "${rolloutLabel}".`);
  }

  if (!valid) {
    return null;
  }

  return {
    code,
    tabName: tab.tabName,
    sourceRow: row.rowNumber,
    source: tab.source,
    track: tab.track,
    saveGroup,
    position,
    pillar,
    topic,
    text,
    inputType,
    unit: orNull(cell(logicRow, "unit")),
    required: requiredLabel === REQUIRED_LABEL,
    guidance: orNull(cell(row, "Hướng dẫn điền")),
    evidenceHint: orNull(cell(row, "Bằng chứng gợi ý")),
    improvementHint: orNull(cell(row, "Gợi ý cải thiện ban đầu")),
    declarationLevel,
    route,
    evidenceRule: buildEvidenceRule(evidenceCode, evidence.get(code), aiCases.get(code)),
    reviewStatus,
    reviewNote: orNull(cell(row, "Nhân · góp ý / cần sửa")),
    reviewedBy: orNull(cell(row, "Người duyệt")),
    reviewedOn,
    rolloutStatus,
    reportSection: orNull(cell(logicRow, "report_section")),
    sourceRef: orNull(cell(row, "Mã nguồn")),
  };
}

function parseRoute(
  raw: string,
  tab: BankTab,
  fail: (message: string) => void,
): Record<string, unknown> {
  if (raw === ROUTE_ALL) {
    if (tab.track === "sector") {
      fail(`Câu ở tab ngành phải có route theo ngành ${tab.source}, không được là ALL.`);
    }
    return {};
  }
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    fail(`route không phải ALL hoặc JSON hợp lệ: "${raw}".`);
    return {};
  }
  const result = routeSchema.safeParse(json);
  if (!result.success) {
    fail(`route phải có dạng {"sector_any":[mã ngành],"capability_any":[mã hoạt động]}: "${raw}".`);
    return {};
  }
  const sectors = result.data.sector_any;
  if (tab.track !== "sector") {
    fail("Câu ở tab hồ sơ và tab Chung phải có route ALL.");
  } else if (sectors.length !== 1 || sectors[0] !== tab.source) {
    fail(`route.sector_any phải đúng [${tab.source}] ở tab này.`);
  }
  return result.data;
}

interface EvidenceEntry {
  readonly row: SheetRow;
  readonly fields: Record<string, string>;
}

function readEvidenceTable(
  table: SheetTable | undefined,
  report: RowContext["report"],
): ReadonlyMap<string, EvidenceEntry> {
  const entries = new Map<string, EvidenceEntry>();
  if (table === undefined) {
    return entries;
  }
  for (const row of table.rows) {
    const code = cell(row, CONTENT_FIRST_HEADER);
    if (!QUESTION_CODE_PATTERN.test(code)) {
      continue;
    }
    if (entries.has(code)) {
      report("error", EVIDENCE_TAB_NAME, row, code, "Mã câu bị lặp trong tab Quy tắc minh chứng.");
      continue;
    }
    const fields: Record<string, string> = {};
    for (const [key, header] of BANK_EVIDENCE_FIELDS) {
      const raw = cell(row, header);
      const value = key === "reviewedOn" ? (normalizeSheetDate(raw) ?? raw) : raw;
      if (value !== "") {
        fields[key] = value;
      }
    }
    entries.set(code, { row, fields });
  }
  return entries;
}

function readAiCases(table: SheetTable | undefined): ReadonlyMap<string, Record<string, string>[]> {
  const cases = new Map<string, Record<string, string>[]>();
  if (table === undefined) {
    return cases;
  }
  for (const row of table.rows) {
    const id = cell(row, AI_CASES_FIRST_HEADER);
    const code = cell(row, "Mã câu");
    if (!/^AI-\d+$/.test(id) || !QUESTION_CODE_PATTERN.test(code)) {
      continue;
    }
    const fields: Record<string, string> = {};
    for (const [key, header] of BANK_AI_CASE_FIELDS) {
      const raw = cell(row, header);
      const value = key === "runDate" ? (normalizeSheetDate(raw) ?? raw) : raw;
      if (value !== "") {
        fields[key] = value;
      }
    }
    const list = cases.get(code) ?? [];
    list.push(fields);
    cases.set(code, list);
  }
  return cases;
}

function buildEvidenceRule(
  code: string,
  entry: EvidenceEntry | undefined,
  testCases: Record<string, string>[] | undefined,
): Record<string, unknown> {
  const rule: Record<string, unknown> = { code, ...(entry?.fields ?? {}) };
  if (testCases !== undefined && testCases.length > 0) {
    rule["testCases"] = testCases;
  }
  return rule;
}

function buildGroups(questions: readonly ParsedQuestion[]): ParsedGroup[] {
  const order = new Map<string, ParsedQuestion[]>();
  for (const question of questions) {
    const list = order.get(question.saveGroup) ?? [];
    list.push(question);
    order.set(question.saveGroup, list);
  }
  const tabIndex = (tabName: string): number => BANK_TABS.findIndex((tab) => tab.tabName === tabName);
  const sorted = [...order.entries()].sort(([, a], [, b]) => {
    const first = a[0];
    const second = b[0];
    if (first === undefined || second === undefined) {
      return 0;
    }
    return (
      tabIndex(first.tabName) - tabIndex(second.tabName) ||
      Math.min(...a.map((item) => item.position)) - Math.min(...b.map((item) => item.position))
    );
  });
  return sorted.map(([code, members], index) => {
    const first = members[0];
    const topics = [...new Set(members.map((member) => member.topic).filter((topic) => topic !== ""))];
    return {
      code,
      tabName: first?.tabName ?? "",
      track: first?.track ?? "core",
      position: index + 1,
      title: topics.length > 0 ? topics.join(", ") : code,
    };
  });
}
