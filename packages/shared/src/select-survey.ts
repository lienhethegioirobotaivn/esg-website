import {
  COMMON_SOURCE,
  HEADCOUNT_TIERS,
  INDUSTRY_SOURCES,
} from "./constants";
import type { HeadcountValue, IndustryValue } from "./constants";
import type { Survey } from "./survey";

export interface SurveySelection {
  readonly industry: string;
  readonly headcount: string;
}

function isIndustry(value: string): value is IndustryValue {
  return value in INDUSTRY_SOURCES;
}

function isHeadcount(value: string): value is HeadcountValue {
  return value in HEADCOUNT_TIERS;
}

export function selectSurvey(
  survey: Survey,
  selection: SurveySelection,
): Survey {
  const industrySource = isIndustry(selection.industry)
    ? INDUSTRY_SOURCES[selection.industry]
    : null;
  const includesExtended =
    isHeadcount(selection.headcount) &&
    HEADCOUNT_TIERS[selection.headcount] === "extended";

  return survey.map((pillar) => ({
    ...pillar,
    groups: pillar.groups
      .map((group) => ({
        ...group,
        questions: group.questions.filter(
          (question) =>
            (question.source === COMMON_SOURCE ||
              question.source === industrySource) &&
            (question.tier === "basic" || includesExtended),
        ),
      }))
      .filter((group) => group.questions.length > 0),
  }));
}
