import type { Pillar, Question, QuestionGroup, Survey } from "./survey";

interface SurveyRows {
  pillars: readonly Pillar[];
  groups: readonly QuestionGroup[];
  questions: readonly Question[];
}

const byOrder = <T extends { order: number }>(a: T, b: T): number =>
  a.order - b.order;

export function buildSurvey({
  pillars,
  groups,
  questions,
}: SurveyRows): Survey {
  return [...pillars].sort(byOrder).map((pillar) => ({
    ...pillar,
    groups: groups
      .filter((group) => group.pillarId === pillar.id)
      .sort(byOrder)
      .map((group) => ({
        ...group,
        questions: questions
          .filter((question) => question.groupId === group.id)
          .sort(byOrder),
      })),
  }));
}
