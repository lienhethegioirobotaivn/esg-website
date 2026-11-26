import { and, asc, eq } from "drizzle-orm";

import type { Database } from "../database/client.js";
import { questionGroups, questionTexts, questions, type Locale } from "../database/schema/index.js";
import type { BankQuestionRecord } from "./survey-bank.builder.js";

export async function loadBankRecords(
  db: Database,
  bankId: string,
  locale: Locale,
): Promise<BankQuestionRecord[]> {
  const rows = await db
    .select({
      code: questions.code,
      source: questions.source,
      track: questionGroups.track,
      groupCode: questionGroups.code,
      pillar: questions.pillar,
      topic: questions.topic,
      inputType: questions.inputType,
      unit: questions.unit,
      required: questions.required,
      text: questions.text,
      guidance: questions.guidance,
      evidenceHint: questions.evidenceHint,
      improvementHint: questions.improvementHint,
      declarationLevel: questions.declarationLevel,
      position: questions.position,
      translatedText: questionTexts.text,
      translatedGuidance: questionTexts.guidance,
    })
    .from(questions)
    .innerJoin(questionGroups, eq(questionGroups.id, questions.groupId))
    .leftJoin(
      questionTexts,
      and(eq(questionTexts.questionId, questions.id), eq(questionTexts.locale, locale)),
    )
    .where(and(eq(questions.bankId, bankId), eq(questions.reviewStatus, "approved")))
    .orderBy(asc(questionGroups.position), asc(questions.position));

  const useTranslation = locale !== "vi";
  return rows.map(({ translatedText, translatedGuidance, ...row }) => ({
    ...row,
    text: useTranslation && translatedText !== null ? translatedText : row.text,
    guidance: useTranslation && translatedGuidance !== null ? translatedGuidance : row.guidance,
  }));
}
