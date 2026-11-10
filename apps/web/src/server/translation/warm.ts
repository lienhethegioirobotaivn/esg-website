import "server-only";

import { after } from "next/server";

import {
  getAdminPosts,
  getRawAchievementStats,
} from "@/features/about/lib/content";
import type { TargetLocale } from "@/features/locale/lib/glossary";
import { callAbout, isAboutBridgeConfigured } from "@/server/about/bridge";
import { getSurveyBank } from "@/server/survey-bank/get-survey-bank";

import { hashText, isTranslatable } from "./hash";
import { collectRichTexts } from "./translate-rich";
import { collectSurveyTexts } from "./translate-survey";
import { translateTexts } from "./translate-texts";

export interface WarmResult {
  total: number;
  remaining: number;
}

export interface PruneResult {
  removed: number;
  keptManual: number;
}

interface ContentTexts {
  live: string[];
  all: string[];
}

async function collectContentTexts(): Promise<ContentTexts> {
  const survey = collectSurveyTexts(await getSurveyBank());
  if (survey.length === 0) {
    throw new Error("Bộ câu hỏi rỗng, dừng lại để không xóa nhầm bản dịch.");
  }
  const live: string[] = [...survey];
  const all: string[] = [...survey];
  for (const post of await getAdminPosts()) {
    const texts = [post.title, post.summary, ...collectRichTexts(post.body)];
    all.push(...texts);
    if (post.status === "published") {
      live.push(...texts);
    }
  }
  const stats = await getRawAchievementStats();
  for (const item of stats?.items ?? []) {
    live.push(item.label);
    all.push(item.label);
  }
  const clean = (list: string[]) => [...new Set(list)].filter(isTranslatable);
  return { live: clean(live), all: clean(all) };
}

const WARM_LOCALES: readonly TargetLocale[] = ["en", "fr", "zh"];

async function warmTexts(
  locale: TargetLocale,
  live: readonly string[],
  budgetMs: number,
): Promise<WarmResult> {
  const found = await translateTexts(locale, live, {
    waitMs: budgetMs,
    ignoreBackoff: true,
  });
  return { total: live.length, remaining: live.length - found.size };
}

export async function warmLocale(
  locale: TargetLocale,
  budgetMs: number,
): Promise<WarmResult> {
  const { live } = await collectContentTexts();
  return warmTexts(locale, live, budgetMs);
}

export interface WarmAllResult {
  locales: Record<TargetLocale, WarmResult>;
  done: boolean;
}

export async function warmAllLocales(budgetMs: number): Promise<WarmAllResult> {
  const { live } = await collectContentTexts();
  const results = await Promise.all(
    WARM_LOCALES.map((locale) => warmTexts(locale, live, budgetMs)),
  );
  const locales = {
    en: results[0] ?? { total: live.length, remaining: live.length },
    fr: results[1] ?? { total: live.length, remaining: live.length },
    zh: results[2] ?? { total: live.length, remaining: live.length },
  };
  return {
    locales,
    done: Object.values(locales).every((result) => result.remaining === 0),
  };
}

const MAINTENANCE_BUDGET_MS = 40_000;

export function scheduleTranslationMaintenance(): void {
  const task = (async () => {
    if (!isAboutBridgeConfigured()) {
      return;
    }
    await warmAllLocales(MAINTENANCE_BUDGET_MS);
    await pruneUnusedTranslations();
  })().catch((error: unknown) => {
    console.error(error);
  });
  try {
    after(task);
  } catch {
    void task;
  }
}

export async function pruneUnusedTranslations(): Promise<PruneResult | null> {
  if (!isAboutBridgeConfigured()) {
    return null;
  }
  const { all } = await collectContentTexts();
  const response = await callAbout("pruneTranslations", {
    keep: all.map((text) => hashText(text)),
  });
  const removed = response["removed"];
  const keptManual = response["keptManual"];
  return {
    removed: typeof removed === "number" ? removed : 0,
    keptManual: typeof keptManual === "number" ? keptManual : 0,
  };
}
