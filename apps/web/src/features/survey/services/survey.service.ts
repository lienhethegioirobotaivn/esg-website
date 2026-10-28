import { buildSurvey } from "@esg/shared";
import type { Survey } from "@esg/shared";

import { pillars, questionGroups, questions } from "@/data";

export interface SurveyService {
  getSurvey(): Promise<Survey>;
}

export const surveyService: SurveyService = {
  async getSurvey() {
    return buildSurvey({ pillars, groups: questionGroups, questions });
  },
};
