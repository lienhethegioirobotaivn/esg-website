import type { Question } from "@esg/shared";

import type { AnswerDraft, AnswerMap } from "../types";

export const EMPTY_DRAFT: AnswerDraft = {
  value: null,
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
    return false;
  }
  if (draft.value !== "implemented") {
    return true;
  }
  const hasDescription = draft.description.trim().length > 0;
  const hasEvidence = draft.evidence.length > 0;
  if (question.descriptionRequirement === "required" && !hasDescription) {
    return false;
  }
  if (question.evidenceRequirement === "required" && !hasEvidence) {
    return false;
  }
  return true;
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
    return draft.value === "implemented" ? total + draft.evidence.length : total;
  }, 0);
}
