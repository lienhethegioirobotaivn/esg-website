import { themeToInput } from "@esg/shared";
import type {
  ImprovementPlanInput,
  ReportArchiveLocale,
  ReportTheme,
} from "@esg/shared";

import type { CompanyFormValues } from "@/features/company";

import type { AnswerMap } from "../types";
import { serializeDraftContent } from "./draft-state";

export function buildArchiveKey(input: {
  company: CompanyFormValues;
  answers: AnswerMap;
  plan: ImprovementPlanInput;
  theme: ReportTheme;
  locale: ReportArchiveLocale;
  logo: File | null;
}): string {
  const evidence = Object.entries(input.answers)
    .flatMap(([questionId, draft]) =>
      draft.evidence.map(
        (item) => `${questionId}:${item.file.name}:${item.file.size}`,
      ),
    )
    .sort();
  return JSON.stringify([
    serializeDraftContent(input.company, input.answers),
    input.plan,
    themeToInput(input.theme),
    input.locale,
    input.logo === null
      ? null
      : [input.logo.name, input.logo.size, input.logo.lastModified],
    evidence,
  ]);
}
