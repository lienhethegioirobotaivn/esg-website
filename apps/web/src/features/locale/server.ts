import { locale as rootLocale } from "next/root-params";

import { DEFAULT_LOCALE, isLocale } from "./constants";
import type { Locale } from "./constants";
import { createT } from "./lib/translate";
import type { TFunction } from "./lib/translate";
import { loadMessages } from "./lib/load-messages";

export { loadMessages };

export async function getLocale(): Promise<Locale> {
  const value = await rootLocale();
  return value !== undefined && isLocale(value) ? value : DEFAULT_LOCALE;
}

export async function getT(): Promise<TFunction> {
  return createT(loadMessages(await getLocale()));
}
