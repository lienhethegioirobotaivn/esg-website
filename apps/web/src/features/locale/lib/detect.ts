import { COUNTRY_LOCALES, FALLBACK_LOCALE, LOCALES } from "../constants";
import type { Locale } from "../constants";

const CRAWLER_PATTERN =
  /bot|crawl|spider|slurp|facebookexternalhit|embedly|whatsapp|telegram|zalo|preview|lighthouse|pingdom|mediapartners|inspectiontool/i;

const UNKNOWN_COUNTRIES = new Set(["XX", "T1"]);

export function isCrawler(userAgent: string | null | undefined): boolean {
  return userAgent ? CRAWLER_PATTERN.test(userAgent) : false;
}

export function normalizeCountry(
  country: string | null | undefined,
): string | null {
  const code = country?.trim().toUpperCase() ?? "";
  return /^[A-Z]{2}$/.test(code) && !UNKNOWN_COUNTRIES.has(code) ? code : null;
}

export function localeFromCountry(country: string): Locale {
  return COUNTRY_LOCALES[country] ?? FALLBACK_LOCALE;
}

export function localeFromAcceptLanguage(
  header: string | null | undefined,
): Locale | null {
  if (!header) {
    return null;
  }
  const ranked = header
    .split(",")
    .map((part, index) => {
      const [tag = "", ...params] = part.trim().split(";");
      const qParam = params.find((param) => param.trim().startsWith("q="));
      const quality = qParam ? Number.parseFloat(qParam.trim().slice(2)) : 1;
      return {
        language: tag.trim().toLowerCase().split("-")[0] ?? "",
        quality: Number.isNaN(quality) ? 0 : quality,
        index,
      };
    })
    .filter((entry) => entry.language !== "" && entry.quality > 0)
    .sort((a, b) => b.quality - a.quality || a.index - b.index);

  for (const entry of ranked) {
    const match = LOCALES.find((locale) => locale === entry.language);
    if (match) {
      return match;
    }
  }
  return null;
}

interface DetectInput {
  country: string | null | undefined;
  acceptLanguage: string | null | undefined;
}

export function detectLocale({ country, acceptLanguage }: DetectInput): Locale {
  const code = normalizeCountry(country);
  if (code !== null) {
    return localeFromCountry(code);
  }
  return localeFromAcceptLanguage(acceptLanguage) ?? FALLBACK_LOCALE;
}
