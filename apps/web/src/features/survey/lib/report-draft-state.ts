import type { CompanyFormValues } from "@/features/company";

import { getDraft } from "./progress";
import { validateReport } from "./report-validation";
import type { ReportValidation } from "./report-validation";
import type { AnswerMap, GroupEntry } from "../types";

export const CONFIRMATION_QUESTION_ID = "C-060";

export interface ReportDraftState {
  readonly isDraft: boolean;
  readonly reasons: readonly string[];
  readonly validation: ReportValidation;
}

export function getReportDraftState(input: {
  company: CompanyFormValues;
  entries: readonly GroupEntry[];
  answers: AnswerMap;
}): ReportDraftState {
  const { company, entries, answers } = input;
  const validation = validateReport({ company, entries, answers });
  const reasons: string[] = [];

  if (validation.companyIssues.length > 0) {
    reasons.push(
      `Thông tin doanh nghiệp còn ${validation.companyIssues.length} mục chưa hợp lệ.`,
    );
  }
  if (validation.questionIssues.length > 0) {
    reasons.push(
      `Còn ${validation.questionIssues.length} câu hỏi chưa trả lời đầy đủ.`,
    );
  }

  const confirmation = entries
    .flatMap((entry) => entry.group.questions)
    .find((question) => question.id === CONFIRMATION_QUESTION_ID);
  if (
    confirmation !== undefined &&
    getDraft(answers, CONFIRMATION_QUESTION_ID).value !== "yes"
  ) {
    reasons.push(
      `Chưa xác nhận thông tin: câu “${confirmation.text}” cần được trả lời “Có”.`,
    );
  }

  return { isDraft: reasons.length > 0, reasons, validation };
}
