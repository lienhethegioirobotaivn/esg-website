export { LanguageSwitcher } from "./components/language-switcher";
export { LocaleLink } from "./components/locale-link";
export {
  DEFAULT_LOCALE,
  HTML_LANG,
  INDEXABLE_LOCALES,
  LOCALES,
  LOCALE_LABELS,
  isLocale,
} from "./constants";
export type { Locale } from "./constants";
export { useBarePathname, useLocale, useLocalePath } from "./hooks/use-locale";
export {
  getLocaleFromPathname,
  localizePath,
  stripLocalePrefix,
} from "./lib/path";
