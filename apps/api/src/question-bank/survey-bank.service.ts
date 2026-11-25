import { createHash } from "node:crypto";

import { Inject, Injectable } from "@nestjs/common";
import type { Survey } from "@esg/shared/node";
import { and, asc, eq } from "drizzle-orm";

import { AppError } from "../common/app-error.js";
import type { Database } from "../database/client.js";
import { DATABASE } from "../database/database.constants.js";
import {
  questionBanks,
  questionGroups,
  questionTexts,
  questions,
  type Locale,
} from "../database/schema/index.js";
import {
  buildSurveyContent,
  type BankQuestionRecord,
  type ProfileQuestion,
} from "./survey-bank.builder.js";

export interface SurveyBankResponse {
  version: string;
  locale: Locale;
  publishedAt: string | null;
  survey: Survey;
  profile: ProfileQuestion[];
}

export interface SurveyBankPayload {
  body: SurveyBankResponse;
  etag: string;
}

const DEFAULT_LOCALE: Locale = "vi";

@Injectable()
export class SurveyBankService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async read(locale: Locale): Promise<SurveyBankPayload> {
    const [bank] = await this.db
      .select({
        id: questionBanks.id,
        version: questionBanks.version,
        publishedAt: questionBanks.publishedAt,
      })
      .from(questionBanks)
      .where(eq(questionBanks.status, "published"));
    if (bank === undefined) {
      throw new AppError(404, "survey_bank_unavailable", "Chưa có bộ câu hỏi nào được xuất bản.");
    }

    const rows = await this.db
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
      .where(and(eq(questions.bankId, bank.id), eq(questions.reviewStatus, "approved")))
      .orderBy(asc(questionGroups.position), asc(questions.position));

    const useTranslation = locale !== DEFAULT_LOCALE;
    const records: BankQuestionRecord[] = rows.map((row) => ({
      code: row.code,
      source: row.source,
      track: row.track,
      groupCode: row.groupCode,
      pillar: row.pillar,
      topic: row.topic,
      inputType: row.inputType,
      unit: row.unit,
      required: row.required,
      text: useTranslation && row.translatedText !== null ? row.translatedText : row.text,
      guidance: useTranslation && row.translatedGuidance !== null ? row.translatedGuidance : row.guidance,
      evidenceHint: row.evidenceHint,
      improvementHint: row.improvementHint,
      declarationLevel: row.declarationLevel,
      position: row.position,
    }));

    const content = buildSurveyContent(records);
    const body: SurveyBankResponse = {
      version: bank.version,
      locale,
      publishedAt: bank.publishedAt === null ? null : bank.publishedAt.toISOString(),
      survey: content.survey,
      profile: content.profile,
    };
    const digest = createHash("sha256").update(JSON.stringify(body)).digest("hex").slice(0, 20);
    return { body, etag: `W/"${bank.version}-${locale}-${digest}"` };
  }
}
