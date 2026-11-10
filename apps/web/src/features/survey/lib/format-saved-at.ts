import { HTML_LANG } from "@/features/locale";
import type { Locale } from "@/features/locale";

const formatters = new Map<Locale, Intl.DateTimeFormat>();

function getFormatter(locale: Locale): Intl.DateTimeFormat {
  const cached = formatters.get(locale);
  if (cached) {
    return cached;
  }
  const created = new Intl.DateTimeFormat(HTML_LANG[locale], {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
  });
  formatters.set(locale, created);
  return created;
}

export function formatSavedAt(iso: string, locale: Locale = "vi"): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "" : getFormatter(locale).format(date);
}
