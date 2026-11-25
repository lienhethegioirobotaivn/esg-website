import { MAX_QUESTIONS_PER_GROUP } from "./question-bank.constants.js";
import type { ImportIssue, ParsedBank } from "./question-bank.types.js";

export class QuestionBankValidationError extends Error {
  readonly issues: readonly ImportIssue[];

  constructor(issues: readonly ImportIssue[]) {
    const errors = issues.filter((issue) => issue.severity === "error");
    super(`Bộ câu hỏi có ${errors.length} lỗi, chưa thể nhập.`);
    this.name = "QuestionBankValidationError";
    this.issues = issues;
  }
}

export function validateQuestionBank(bank: ParsedBank): ImportIssue[] {
  const issues: ImportIssue[] = [...bank.issues];
  const add = (
    severity: ImportIssue["severity"],
    tab: string,
    code: string | null,
    message: string,
  ): void => {
    issues.push({ severity, tab, row: null, code, message });
  };

  if (bank.questions.length === 0) {
    add("error", "", null, "Không có câu hỏi hợp lệ nào để nhập.");
    return issues;
  }

  const byGroup = new Map<string, number>();
  const groupTabs = new Map<string, Set<string>>();
  const positions = new Map<string, string>();
  for (const question of bank.questions) {
    byGroup.set(question.saveGroup, (byGroup.get(question.saveGroup) ?? 0) + 1);
    const tabs = groupTabs.get(question.saveGroup) ?? new Set<string>();
    tabs.add(question.tabName);
    groupTabs.set(question.saveGroup, tabs);

    const positionKey = `${question.tabName}#${question.position}`;
    const clash = positions.get(positionKey);
    if (clash !== undefined) {
      add("error", question.tabName, question.code, `order ${question.position} trùng với ${clash}.`);
    } else {
      positions.set(positionKey, question.code);
    }
  }

  for (const [group, count] of byGroup) {
    if (count > MAX_QUESTIONS_PER_GROUP) {
      add("error", "", group, `Nhóm lưu có ${count} câu, vượt giới hạn ${MAX_QUESTIONS_PER_GROUP}.`);
    }
    const tabs = groupTabs.get(group);
    if (tabs !== undefined && tabs.size > 1) {
      add("error", "", group, `Nhóm lưu trải trên nhiều tab: ${[...tabs].join(", ")}.`);
    }
  }

  const approved = bank.questions.filter((question) => question.reviewStatus === "approved");
  if (approved.length === 0) {
    add("error", "", null, "Không có câu nào ở trạng thái Đã duyệt.");
  }
  for (const question of bank.questions) {
    if (question.reviewStatus === "pending") {
      add("warning", question.tabName, question.code, "Câu đang Chờ duyệt, sẽ không hiển thị khi xuất bản.");
    }
    if (question.evidenceRule !== null && !("accepted" in question.evidenceRule)) {
      add("warning", question.tabName, question.code, "Chưa có quy tắc minh chứng chi tiết ở tab 18.");
    }
  }
  return issues;
}

export function hasErrors(issues: readonly ImportIssue[]): boolean {
  return issues.some((issue) => issue.severity === "error");
}
