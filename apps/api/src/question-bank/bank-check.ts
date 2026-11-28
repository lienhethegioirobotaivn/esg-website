import { INPUT_TYPES, type BankChanges, type BankIssue } from "@esg/shared/node";

import { toParsedBank, type StoredBank, type StoredQuestion } from "./bank-records.js";
import { REPORT_DEPENDENT_CODES } from "./question-bank.constants.js";
import { buildSurveyContent } from "./survey-bank.builder.js";
import { validateQuestionBank } from "./validate-question-bank.js";

const COMPARED_FIELDS = [
  "source",
  "pillar",
  "topic",
  "text",
  "guidance",
  "evidenceHint",
  "improvementHint",
  "inputType",
  "unit",
  "required",
  "declarationLevel",
  "route",
  "evidenceRule",
  "reviewStatus",
  "reviewNote",
  "reviewedBy",
  "reviewedOn",
  "rolloutStatus",
  "reportSection",
  "sourceRef",
] as const satisfies readonly (keyof StoredQuestion)[];

function stable(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stable).join(",")}]`;
  }
  if (typeof value === "object" && value !== null) {
    const entries = Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, item]) => `${JSON.stringify(key)}:${stable(item)}`);
    return `{${entries.join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

export function checkStoredBank(version: string, stored: StoredBank): BankIssue[] {
  const parsed = toParsedBank(version, stored);
  const issues: BankIssue[] = validateQuestionBank(parsed);
  const add = (severity: BankIssue["severity"], tab: string, code: string, message: string): void => {
    issues.push({ severity, tab, row: null, code, message });
  };

  for (const question of parsed.questions) {
    if (question.track === "profile") {
      continue;
    }
    if (question.pillar === null) {
      add("error", question.tabName, question.code, "Chưa chọn trụ cột E, S hoặc G.");
    }
    if (!INPUT_TYPES.some((type) => type === question.inputType)) {
      add("error", question.tabName, question.code, `Loại trả lời ${question.inputType} chỉ dùng ở tab Hồ sơ.`);
    }
  }

  const approved = new Set(
    parsed.questions
      .filter((question) => question.reviewStatus === "approved")
      .map((question) => question.code),
  );
  for (const code of REPORT_DEPENDENT_CODES) {
    if (!approved.has(code)) {
      add("warning", "", code, "Báo cáo đang dùng câu này; thiếu hoặc ẩn câu sẽ làm báo cáo thiếu dữ liệu.");
    }
  }

  if (!issues.some((issue) => issue.severity === "error")) {
    try {
      buildSurveyContent(
        parsed.questions
          .filter((question) => question.reviewStatus === "approved")
          .map((question) => ({
            ...question,
            groupCode: question.saveGroup,
          })),
      );
    } catch {
      add("error", "", "", "Bộ câu hỏi chưa dựng được thành khảo sát. Kiểm tra lại các câu vừa sửa.");
    }
  }
  return issues;
}

function longestIncreasingRun(values: readonly number[]): Set<number> {
  const chains: number[][] = [];
  for (const value of values) {
    let best: number[] = [];
    for (const chain of chains) {
      if (chain.length > best.length && (chain.at(-1) ?? value) < value) {
        best = chain;
      }
    }
    chains.push([...best, value]);
  }
  return new Set(chains.reduce<number[]>((best, chain) => (chain.length > best.length ? chain : best), []));
}

function movedCodes(previous: readonly StoredQuestion[], next: readonly StoredQuestion[]): Set<string> {
  const before = new Map(previous.map((question) => [question.code, question]));
  const moved = new Set<string>();
  for (const source of new Set(next.map((question) => question.source))) {
    const shared = next
      .filter((question) => question.source === source && before.get(question.code)?.source === source)
      .sort((a, b) => a.position - b.position)
      .map((question) => ({ code: question.code, was: before.get(question.code)?.position ?? 0 }));
    const kept = longestIncreasingRun(shared.map((item) => item.was));
    for (const item of shared) {
      if (!kept.has(item.was)) {
        moved.add(item.code);
      }
    }
  }
  return moved;
}

export function compareBanks(
  comparedTo: string | null,
  previous: readonly StoredQuestion[],
  next: readonly StoredQuestion[],
): BankChanges {
  if (comparedTo === null) {
    return { comparedTo, added: [], removed: [], changed: [] };
  }
  const before = new Map(previous.map((question) => [question.code, question]));
  const after = new Set(next.map((question) => question.code));
  const moved = movedCodes(previous, next);
  const added: string[] = [];
  const changed: string[] = [];
  for (const question of next) {
    const old = before.get(question.code);
    if (old === undefined) {
      added.push(question.code);
    } else if (
      moved.has(question.code) ||
      COMPARED_FIELDS.some((field) => stable(old[field]) !== stable(question[field]))
    ) {
      changed.push(question.code);
    }
  }
  return {
    comparedTo,
    added,
    changed,
    removed: previous.filter((question) => !after.has(question.code)).map((question) => question.code),
  };
}
