import type {
  ProfileQuestion,
  SurveyBankContent,
} from "../question-bank/survey-bank.builder.js";

export function collectSurveyContentTexts({ survey, profile }: SurveyBankContent): string[] {
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
  for (const question of profile) {
    texts.push(
      question.text,
      question.topic,
      question.guidance.title,
      question.guidance.body,
      question.guidance.suggestedEvidence,
      question.guidance.tip,
    );
  }
  return texts;
}

export function applySurveyContentTexts(
  { survey, profile }: SurveyBankContent,
  map: ReadonlyMap<string, string>,
): SurveyBankContent {
  const tr = (text: string): string => map.get(text) ?? text;
  const guidance = (value: ProfileQuestion["guidance"]): ProfileQuestion["guidance"] => ({
    title: tr(value.title),
    body: tr(value.body),
    suggestedEvidence: tr(value.suggestedEvidence),
    tip: tr(value.tip),
  });
  return {
    survey: survey.map((pillar) => ({
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
          guidance: guidance(question.guidance),
        })),
      })),
    })),
    profile: profile.map((question) => ({
      ...question,
      text: tr(question.text),
      topic: tr(question.topic),
      guidance: guidance(question.guidance),
    })),
  };
}
