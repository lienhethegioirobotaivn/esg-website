import "server-only";

import type { Survey } from "@esg/shared";

import type { Locale } from "@/features/locale";

import { translateTexts } from "./translate-texts";

export function collectSurveyTexts(survey: Survey): string[] {
  const texts: string[] = [];
  for (const pillar of survey) {
    texts.push(pillar.name);
    for (const group of pillar.groups) {
      texts.push(group.title, group.description);
      for (const question of group.questions) {
        texts.push(
          question.text,
          question.topic,
          question.improvementHint,
          question.guidance.title,
          question.guidance.body,
          question.guidance.suggestedEvidence,
          question.guidance.tip,
        );
      }
    }
  }
  return texts;
}

export async function translateSurvey(survey: Survey, locale: Locale): Promise<Survey> {
  if (locale === "vi") {
    return survey;
  }
  const map = await translateTexts(locale, collectSurveyTexts(survey));
  if (map.size === 0) {
    return survey;
  }
  const tr = (text: string): string => map.get(text) ?? text;
  return survey.map((pillar) => ({
    ...pillar,
    name: tr(pillar.name),
    groups: pillar.groups.map((group) => ({
      ...group,
      title: tr(group.title),
      description: tr(group.description),
      questions: group.questions.map((question) => ({
        ...question,
        text: tr(question.text),
        topic: tr(question.topic),
        improvementHint: tr(question.improvementHint),
        guidance: {
          title: tr(question.guidance.title),
          body: tr(question.guidance.body),
          suggestedEvidence: tr(question.guidance.suggestedEvidence),
          tip: tr(question.guidance.tip),
        },
      })),
    })),
  }));
}
