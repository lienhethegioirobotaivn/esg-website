import "server-only";

import {
  getAchievementStats,
  getPublishedPostsRaw,
} from "@/features/about/lib/content";
import type { TargetLocale } from "@/features/locale/lib/glossary";
import { collectRichTexts } from "@/server/translation/translate-rich";
import { getSurveyBank } from "@/server/survey-bank/get-survey-bank";

import { isTranslatable } from "./hash";
import { collectSurveyTexts } from "./translate-survey";
import { translateTexts } from "./translate-texts";

export interface WarmResult {
  total: number;
  remaining: number;
}

async function collectAllTexts(): Promise<string[]> {
  const texts: string[] = collectSurveyTexts(await getSurveyBank());
  for (const post of await getPublishedPostsRaw()) {
    texts.push(post.title, post.summary, ...collectRichTexts(post.body));
  }
  const stats = await getAchievementStats("vi");
  for (const item of stats?.items ?? []) {
    texts.push(item.label);
  }
  return [...new Set(texts)].filter(isTranslatable);
}

export async function warmLocale(
  locale: TargetLocale,
  budgetMs: number,
): Promise<WarmResult> {
  const texts = await collectAllTexts();
  const found = await translateTexts(locale, texts, {
    waitMs: budgetMs,
    ignoreBackoff: true,
  });
  return { total: texts.length, remaining: texts.length - found.size };
}
