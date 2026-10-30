import type { DraftAnswer, DraftContent, DraftSnapshot } from "@esg/shared";

import { COMPANY_FIELDS, COMPANY_INITIAL_VALUES, pickCompanyValues } from "@/features/company";
import type { CompanyFormValues } from "@/features/company";

import type { AnswerMap, GroupEntry } from "../types";

export interface RestoredDraft {
  readonly company: CompanyFormValues;
  readonly answers: AnswerMap;
  readonly activeGroupId: string | null;
  readonly savedAt: string | null;
}

export const EMPTY_RESTORED_DRAFT: RestoredDraft = {
  company: COMPANY_INITIAL_VALUES,
  answers: {},
  activeGroupId: null,
  savedAt: null,
};

export function toDraftAnswers(answers: AnswerMap): Record<string, DraftAnswer> {
  const result: Record<string, DraftAnswer> = {};
  for (const [questionId, draft] of Object.entries(answers)) {
    if (draft.value !== null) {
      result[questionId] = {
        value: draft.value,
        description: draft.value === "implemented" ? draft.description : "",
      };
    }
  }
  return result;
}

export function toDraftContent(
  company: CompanyFormValues,
  answers: AnswerMap,
  activeGroupId: string | null,
): DraftContent {
  return { company, answers: toDraftAnswers(answers), activeGroupId };
}

export function serializeDraftContent(
  company: CompanyFormValues,
  answers: AnswerMap,
): string {
  const answerEntries = Object.entries(toDraftAnswers(answers)).sort(
    ([left], [right]) => (left < right ? -1 : left > right ? 1 : 0),
  );
  return JSON.stringify({
    company: COMPANY_FIELDS.map((field) => company[field]),
    answers: answerEntries,
  });
}

export function restoreDraft(
  snapshot: DraftSnapshot | null,
  entries: readonly GroupEntry[],
): RestoredDraft {
  if (snapshot === null) {
    return EMPTY_RESTORED_DRAFT;
  }
  const questionIds = new Set(
    entries.flatMap((entry) => entry.group.questions.map((question) => question.id)),
  );
  const groupIds = new Set(entries.map((entry) => entry.group.id));
  const answers: Record<string, AnswerMap[string]> = {};
  for (const [questionId, answer] of Object.entries(snapshot.answers)) {
    if (questionIds.has(questionId)) {
      answers[questionId] = {
        value: answer.value,
        description: answer.value === "implemented" ? answer.description : "",
        evidence: [],
      };
    }
  }
  const { activeGroupId } = snapshot;
  return {
    company: pickCompanyValues(snapshot.company),
    answers,
    activeGroupId:
      activeGroupId !== null && groupIds.has(activeGroupId) ? activeGroupId : null,
    savedAt: snapshot.savedAt,
  };
}

export function hasNewlyCompleted(
  previous: ReadonlySet<string>,
  current: ReadonlySet<string>,
): boolean {
  for (const id of current) {
    if (!previous.has(id)) {
      return true;
    }
  }
  return false;
}
