import "server-only";

import enMessages from "@/i18n/messages/en.json";
import frMessages from "@/i18n/messages/fr.json";
import zhMessages from "@/i18n/messages/zh.json";
import enOverrides from "@/i18n/overrides/en.json";
import frOverrides from "@/i18n/overrides/fr.json";
import zhOverrides from "@/i18n/overrides/zh.json";

import { DEFAULT_LOCALE } from "../constants";
import type { Locale } from "../constants";
import type { Messages } from "../lib/translate";

const DICTIONARIES: Record<Exclude<Locale, "vi">, Messages> = {
  en: { ...enMessages, ...enOverrides },
  fr: { ...frMessages, ...frOverrides },
  zh: { ...zhMessages, ...zhOverrides },
};

export function loadMessages(locale: Locale): Messages {
  if (locale === DEFAULT_LOCALE) {
    return {};
  }
  return DICTIONARIES[locale as Exclude<Locale, "vi">];
}
