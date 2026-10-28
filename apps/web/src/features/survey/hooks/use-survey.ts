"use client";

import { buildSurvey } from "@esg/shared";
import type { Survey } from "@esg/shared";
import { useMemo } from "react";

import { useSurveyContentStore } from "../store/survey-content-store";

export function useSurvey(): Survey {
  const pillars = useSurveyContentStore((state) => state.pillars);
  const groups = useSurveyContentStore((state) => state.groups);
  const questions = useSurveyContentStore((state) => state.questions);

  return useMemo(
    () => buildSurvey({ pillars, groups, questions }),
    [pillars, groups, questions],
  );
}
