import { companyProfileSchema, getAnswerIssues } from "@esg/shared";
import type { Question } from "@esg/shared";

import { COMPANY_FIELDS } from "@/features/company";
import type { CompanyField, CompanyFormValues } from "@/features/company";
import { msg } from "@/features/locale";

import { getDraft } from "./progress";
import type { AnswerDraft, AnswerMap, GroupEntry } from "../types";

export type QuestionIssueReason =
  | "unanswered"
  | "missing-detail"
  | "invalid-number";

export interface CompanyIssue {
  readonly field: CompanyField;
  readonly message: string;
}

export interface QuestionIssue {
  readonly questionId: string;
  readonly questionNumber: number;
  readonly questionText: string;
  readonly groupId: string;
  readonly groupTitle: string;
  readonly groupPosition: number;
  readonly pillarName: string;
  readonly reasons: readonly QuestionIssueReason[];
}

export interface ReportValidation {
  readonly companyIssues: readonly CompanyIssue[];
  readonly questionIssues: readonly QuestionIssue[];
  readonly isValid: boolean;
}

export const REASON_LABELS: Record<QuestionIssueReason, string> = {
  unanswered: msg("Chưa trả lời"),
  "missing-detail": msg("Thiếu nội dung, ghi chú hoặc lý do"),
  "invalid-number": msg("Số liệu chưa hợp lệ"),
};

export function getIncompleteReasons(
  question: Question,
  draft: AnswerDraft,
): QuestionIssueReason[] {
  return getAnswerIssues(question, draft);
}

function isCompanyField(key: PropertyKey): key is CompanyField {
  return COMPANY_FIELDS.some((field) => field === key);
}

export function validateCompany(company: CompanyFormValues): CompanyIssue[] {
  const result = companyProfileSchema.safeParse({
    ...company,
    reportYear: company.reportYear === "" ? undefined : Number(company.reportYear),
  });
  if (result.success) {
    return [];
  }
  const seen = new Set<CompanyField>();
  const issues: CompanyIssue[] = [];
  for (const issue of result.error.issues) {
    const key = issue.path[0];
    if (key !== undefined && isCompanyField(key) && !seen.has(key)) {
      seen.add(key);
      issues.push({ field: key, message: issue.message });
    }
  }
  return issues.sort(
    (left, right) =>
      COMPANY_FIELDS.indexOf(left.field) - COMPANY_FIELDS.indexOf(right.field),
  );
}

export function validateQuestions(
  entries: readonly GroupEntry[],
  answers: AnswerMap,
): QuestionIssue[] {
  const issues: QuestionIssue[] = [];
  entries.forEach((entry, entryIndex) => {
    entry.group.questions.forEach((question, questionIndex) => {
      const reasons = getIncompleteReasons(question, getDraft(answers, question.id));
      if (reasons.length > 0) {
        issues.push({
          questionId: question.id,
          questionNumber: questionIndex + 1,
          questionText: question.text,
          groupId: entry.group.id,
          groupTitle: entry.group.title,
          groupPosition: entryIndex + 1,
          pillarName: entry.pillarName,
          reasons,
        });
      }
    });
  });
  return issues;
}

export function validateReport(input: {
  company: CompanyFormValues;
  entries: readonly GroupEntry[];
  answers: AnswerMap;
}): ReportValidation {
  const companyIssues = validateCompany(input.company);
  const questionIssues = validateQuestions(input.entries, input.answers);
  return {
    companyIssues,
    questionIssues,
    isValid: companyIssues.length === 0 && questionIssues.length === 0,
  };
}
