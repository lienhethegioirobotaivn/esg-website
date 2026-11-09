export const LOCALES = ["vi", "en", "zh", "fr"] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "vi";

export const FALLBACK_LOCALE: Locale = "en";

export const INDEXABLE_LOCALES: readonly Locale[] = ["vi"];

export const LOCALE_LABELS: Record<Locale, string> = {
  vi: "Tiếng Việt",
  en: "English",
  zh: "中文",
  fr: "Français",
};

export const HTML_LANG: Record<Locale, string> = {
  vi: "vi",
  en: "en",
  zh: "zh-CN",
  fr: "fr",
};

export const LOCALE_COOKIE = "esg-locale";

export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export const COUNTRY_LOCALES: Readonly<Record<string, Locale>> = {
  VN: "vi",
  CN: "zh",
  HK: "zh",
  MO: "zh",
  TW: "zh",
  FR: "fr",
  BE: "fr",
  LU: "fr",
  MC: "fr",
};

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}
