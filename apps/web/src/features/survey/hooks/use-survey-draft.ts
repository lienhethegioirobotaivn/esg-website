import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";

import { COMPANY_INITIAL_VALUES } from "@/features/company";
import type { CompanyFormValues } from "@/features/company";

import {
  getDraftRaw,
  getServerDraftRaw,
  parseDraft,
  saveDraft,
  subscribeDraft,
} from "../lib/draft-storage";
import {
  hasNewlyCompleted,
  restoreDraft,
  serializeDraftContent,
  toDraftContent,
} from "../lib/draft-state";
import { countEvidence, isGroupComplete } from "../lib/progress";
import type { AnswerMap, GroupEntry } from "../types";

interface UseSurveyDraftInput {
  entries: readonly GroupEntry[];
  answers: AnswerMap;
  company: CompanyFormValues;
  activeGroupId: string | null;
}

interface SurveyDraft {
  savedAt: string | null;
  isDirty: boolean;
  hasEvidence: boolean;
  saveFailed: boolean;
  saveNow: () => void;
  persist: () => boolean;
}

const EMPTY_KEY = serializeDraftContent(COMPANY_INITIAL_VALUES, {});

export function useSurveyDraft({
  entries,
  answers,
  company,
  activeGroupId,
}: UseSurveyDraftInput): SurveyDraft {
  const raw = useSyncExternalStore(subscribeDraft, getDraftRaw, getServerDraftRaw);
  const [saveFailed, setSaveFailed] = useState(false);

  const saved = useMemo(
    () => restoreDraft(parseDraft(raw), entries),
    [raw, entries],
  );
  const savedKey = saved.savedAt === null
    ? EMPTY_KEY
    : serializeDraftContent(saved.company, saved.answers);
  const currentKey = useMemo(
    () => serializeDraftContent(company, answers),
    [company, answers],
  );

  const allQuestions = useMemo(
    () => entries.flatMap((entry) => entry.group.questions),
    [entries],
  );
  const hasEvidence = countEvidence(allQuestions, answers) > 0;

  const persist = useCallback(
    () => saveDraft(toDraftContent(company, answers, activeGroupId)),
    [company, answers, activeGroupId],
  );

  const saveNow = useCallback(() => {
    setSaveFailed(!persist());
  }, [persist]);

  const completedGroupIds = useMemo(
    () =>
      new Set(
        entries
          .filter((entry) => isGroupComplete(entry.group.questions, answers))
          .map((entry) => entry.group.id),
      ),
    [entries, answers],
  );
  const previousCompleted = useRef<ReadonlySet<string> | null>(null);

  useEffect(() => {
    const previous = previousCompleted.current;
    previousCompleted.current = completedGroupIds;
    if (previous !== null && hasNewlyCompleted(previous, completedGroupIds)) {
      persist();
    }
  }, [completedGroupIds, persist]);

  return {
    savedAt: saved.savedAt,
    isDirty: currentKey !== savedKey,
    hasEvidence,
    saveFailed,
    saveNow,
    persist,
  };
}
