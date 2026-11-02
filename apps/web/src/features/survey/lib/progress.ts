import { getAnswerFields, isAnswerComplete } from "@esg/shared";
import type { Question } from "@esg/shared";

import type { AnswerDraft, AnswerMap } from "../types";

export const EMPTY_DRAFT: AnswerDraft = {
  value: null,
  number: "",
  description: "",
  evidence: [],
};

export function getDraft(answers: AnswerMap, questionId: string): AnswerDraft {
  return answers[questionId] ?? EMPTY_DRAFT;
}

export function isQuestionComplete(
  question: Question,
  draft: AnswerDraft,
): boolean {
  if (draft.value === null) {
    return !question.required;
  }
  return isAnswerComplete(question, draft);
}

export function countCompleted(
  questions: readonly Question[],
  answers: AnswerMap,
): number {
  return questions.filter((question) =>
    isQuestionComplete(question, getDraft(answers, question.id)),
  ).length;
}

export function isGroupComplete(
  questions: readonly Question[],
  answers: AnswerMap,
): boolean {
  return (
    questions.length > 0 && countCompleted(questions, answers) === questions.length
  );
}

export function countEvidence(
  questions: readonly Question[],
  answers: AnswerMap,
): number {
  return questions.reduce((total, question) => {
    const draft = getDraft(answers, question.id);
    const fields = getAnswerFields(question.inputType, draft.value);
    return fields.evidence ? total + draft.evidence.length : total;
  }, 0);
}
