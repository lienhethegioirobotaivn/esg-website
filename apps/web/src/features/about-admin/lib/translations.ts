export type TranslationLocale = "en" | "fr" | "zh";

export const TRANSLATION_LOCALE_LABELS: Readonly<
  Record<TranslationLocale, string>
> = {
  en: "tiếng Anh",
  fr: "tiếng Pháp",
  zh: "tiếng Trung",
};

export interface TranslationItem {
  sourceHash: string;
  sourceText: string;
  autoText: string | null;
  manualText: string | null;
  glossaryText: string | null;
  status: "manual" | "glossary" | "auto" | "missing";
  failedAttempts: number;
  updatedAt: string;
}

export interface TranslationList {
  items: TranslationItem[];
  total: number;
  configured: boolean;
}

export interface TranslationRunResult {
  configured: boolean;
  stoppedReason:
    | "time_budget"
    | "daily_limit"
    | "rate_limited"
    | "error"
    | null;
  requests: number;
  locales: Partial<
    Record<
      TranslationLocale,
      { total: number; translated: number; remaining: number }
    >
  >;
}

export interface TranslationPruneResult {
  removed: number;
  keptManual: number;
  skipped: boolean;
}
