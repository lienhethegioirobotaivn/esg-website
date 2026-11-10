import type { CompanyField, CompanyFormValues } from "@/features/company";
import { createT } from "@/features/locale";
import type { TFunction } from "@/features/locale";

import { getDraft } from "./progress";
import { validateReport } from "./report-validation";
import type { ReportValidation } from "./report-validation";
import type { AnswerMap, GroupEntry } from "../types";

export const CONFIRMATION_QUESTION_ID = "C-060";

export type DraftJumpTarget =
  | { readonly kind: "question"; readonly questionId: string }
  | { readonly kind: "company"; readonly field: CompanyField };

export interface DraftReason {
  readonly text: string;
  readonly target: DraftJumpTarget;
}

export interface ReportDraftState {
  readonly isDraft: boolean;
  readonly reasons: readonly DraftReason[];
  readonly validation: ReportValidation;
}

const identityT = createT({});

export function getReportDraftState(
  input: {
    company: CompanyFormValues;
    entries: readonly GroupEntry[];
    answers: AnswerMap;
  },
  t: TFunction = identityT,
): ReportDraftState {
  const { company, entries, answers } = input;
  const validation = validateReport({ company, entries, answers });
  const reasons: DraftReason[] = [];

  const firstCompanyIssue = validation.companyIssues[0];
  if (firstCompanyIssue !== undefined) {
    reasons.push({
      text: t("Thông tin doanh nghiệp còn {count} mục chưa hợp lệ.", {
        count: validation.companyIssues.length,
      }),
      target: { kind: "company", field: firstCompanyIssue.field },
    });
  }
  const firstQuestionIssue = validation.questionIssues[0];
  if (firstQuestionIssue !== undefined) {
    reasons.push({
      text: t("Còn {count} câu hỏi chưa trả lời đầy đủ.", {
        count: validation.questionIssues.length,
      }),
      target: { kind: "question", questionId: firstQuestionIssue.questionId },
    });
  }

  const confirmation = entries
    .flatMap((entry) => entry.group.questions)
    .find((question) => question.id === CONFIRMATION_QUESTION_ID);
  if (
    confirmation !== undefined &&
    getDraft(answers, CONFIRMATION_QUESTION_ID).value !== "yes"
  ) {
    reasons.push({
      text: t(
        "Chưa xác nhận thông tin: câu “{question}” cần được trả lời “Có”.",
        { question: confirmation.text },
      ),
      target: { kind: "question", questionId: CONFIRMATION_QUESTION_ID },
    });
  }

  return { isDraft: reasons.length > 0, reasons, validation };
}
