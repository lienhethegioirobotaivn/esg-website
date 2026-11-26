import { Inject, Injectable } from "@nestjs/common";
import { sanitizeRichDoc, statItemSchema } from "@esg/shared/node";
import { eq } from "drizzle-orm";
import { z } from "zod";

import type { Database } from "../database/client.js";
import { DATABASE } from "../database/database.constants.js";
import { posts, questionBanks, siteStats } from "../database/schema/index.js";
import { loadBankRecords } from "../question-bank/load-bank-records.js";
import { buildSurveyContent } from "../question-bank/survey-bank.builder.js";
import { ACHIEVEMENT_STATS_KEY } from "../stats/stats.constants.js";
import { uniqueTranslatable } from "./hash.js";
import { collectRichTexts } from "./rich-texts.js";
import { collectSurveyContentTexts } from "./survey-texts.js";

export interface ContentTexts {
  live: string[];
  all: string[];
  hasBank: boolean;
}

const statsSchema = z.array(statItemSchema);

@Injectable()
export class ContentSourcesService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async collect(): Promise<ContentTexts> {
    const survey = await this.surveyTexts();
    const live: string[] = [...survey];
    const all: string[] = [...survey];

    const rows = await this.db
      .select({
        title: posts.title,
        excerpt: posts.excerpt,
        body: posts.body,
        status: posts.status,
      })
      .from(posts)
      .where(eq(posts.locale, "vi"));
    for (const row of rows) {
      const texts = [row.title, row.excerpt ?? "", ...collectRichTexts(sanitizeRichDoc(row.body))];
      for (const text of texts) {
        all.push(text);
        if (row.status === "published") {
          live.push(text);
        }
      }
    }

    for (const label of await this.statLabels()) {
      live.push(label);
      all.push(label);
    }

    return {
      live: uniqueTranslatable(live),
      all: uniqueTranslatable(all),
      hasBank: survey.length > 0,
    };
  }

  private async surveyTexts(): Promise<string[]> {
    const [bank] = await this.db
      .select({ id: questionBanks.id })
      .from(questionBanks)
      .where(eq(questionBanks.status, "published"));
    if (bank === undefined) {
      return [];
    }
    const records = await loadBankRecords(this.db, bank.id, "vi");
    return collectSurveyContentTexts(buildSurveyContent(records));
  }

  private async statLabels(): Promise<string[]> {
    const [row] = await this.db
      .select({ value: siteStats.value })
      .from(siteStats)
      .where(eq(siteStats.key, ACHIEVEMENT_STATS_KEY))
      .limit(1);
    const parsed = statsSchema.safeParse(row?.value);
    return parsed.success ? parsed.data.map((item) => item.label) : [];
  }
}
