import { LOCALE_COOKIE, LOCALE_COOKIE_MAX_AGE } from "../constants";
import type { Locale } from "../constants";

export function persistLocale(locale: Locale): void {
  if (typeof document === "undefined") {
    return;
  }
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=${LOCALE_COOKIE_MAX_AGE}; samesite=lax`;
}
