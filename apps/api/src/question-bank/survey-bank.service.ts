import { createHash } from "node:crypto";

import { Inject, Injectable } from "@nestjs/common";
import type { Survey } from "@esg/shared/node";
import { eq } from "drizzle-orm";

import { AppError } from "../common/app-error.js";
import type { Database } from "../database/client.js";
import { DATABASE } from "../database/database.constants.js";
import { questionBanks, type Locale } from "../database/schema/index.js";
import {
  applySurveyContentTexts,
  collectSurveyContentTexts,
} from "../translation/survey-texts.js";
import { TranslationMemoryService } from "../translation/translation-memory.service.js";
import { loadBankRecords } from "./load-bank-records.js";
import {
  buildSurveyContent,
  type ProfileQuestion,
  type SurveyBankContent,
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

@Injectable()
export class SurveyBankService {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    @Inject(TranslationMemoryService) private readonly memory: TranslationMemoryService,
  ) {}

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

    const records = await loadBankRecords(this.db, bank.id, locale);
    const content = await this.localize(buildSurveyContent(records), locale);
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

  private async localize(content: SurveyBankContent, locale: Locale): Promise<SurveyBankContent> {
    if (locale === "vi") {
      return content;
    }
    const map = await this.memory.lookup(locale, collectSurveyContentTexts(content));
    return map.size === 0 ? content : applySurveyContentTexts(content, map);
  }
}
