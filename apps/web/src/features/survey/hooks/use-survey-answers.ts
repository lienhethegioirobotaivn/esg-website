import { MAX_EVIDENCE_FILES } from "@esg/shared";
import type { AnswerValue } from "@esg/shared";
import { useMemo, useReducer } from "react";

import type { EvidenceItem } from "@/features/evidence";

import { getDraft } from "../lib/progress";
import type { AnswerDraft, AnswerMap } from "../types";

type AnswerAction =
  | { type: "select"; questionId: string; value: AnswerValue }
  | { type: "describe"; questionId: string; description: string }
  | { type: "add-evidence"; questionId: string; item: EvidenceItem }
  | { type: "remove-evidence"; questionId: string; evidenceId: string };

function updateDraft(
  state: AnswerMap,
  questionId: string,
  update: (draft: AnswerDraft) => AnswerDraft,
): AnswerMap {
  return { ...state, [questionId]: update(getDraft(state, questionId)) };
}

function answersReducer(state: AnswerMap, action: AnswerAction): AnswerMap {
  switch (action.type) {
    case "select":
      return updateDraft(state, action.questionId, (draft) => ({
        ...draft,
        value: action.value,
      }));
    case "describe":
      return updateDraft(state, action.questionId, (draft) => ({
        ...draft,
        description: action.description,
      }));
    case "add-evidence":
      return updateDraft(state, action.questionId, (draft) =>
        draft.evidence.length >= MAX_EVIDENCE_FILES
          ? draft
          : { ...draft, evidence: [...draft.evidence, action.item] },
      );
    case "remove-evidence":
      return updateDraft(state, action.questionId, (draft) => ({
        ...draft,
        evidence: draft.evidence.filter(
          (item) => item.id !== action.evidenceId,
        ),
      }));
  }
}

export interface SurveyAnswerActions {
  select: (questionId: string, value: AnswerValue) => void;
  describe: (questionId: string, description: string) => void;
  addEvidence: (questionId: string, file: File) => void;
  removeEvidence: (questionId: string, evidenceId: string) => void;
}

export function useSurveyAnswers(): {
  answers: AnswerMap;
  actions: SurveyAnswerActions;
} {
  const [answers, dispatch] = useReducer(answersReducer, {});

  const actions = useMemo<SurveyAnswerActions>(
    () => ({
      select: (questionId, value) =>
        dispatch({ type: "select", questionId, value }),
      describe: (questionId, description) =>
        dispatch({ type: "describe", questionId, description }),
      addEvidence: (questionId, file) =>
        dispatch({
          type: "add-evidence",
          questionId,
          item: { id: crypto.randomUUID(), file },
        }),
      removeEvidence: (questionId, evidenceId) =>
        dispatch({ type: "remove-evidence", questionId, evidenceId }),
    }),
    [],
  );

  return { answers, actions };
}
