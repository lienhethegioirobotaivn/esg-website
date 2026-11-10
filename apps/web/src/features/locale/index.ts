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
export { I18nProvider, useT } from "./provider/i18n-provider";
export { createT, interpolate, msg } from "./lib/translate";
export { translateOptions } from "./lib/translate-options";
export type { Messages, TFunction, TranslateVars } from "./lib/translate";
export {
  getLocaleFromPathname,
  localizePath,
  stripLocalePrefix,
} from "./lib/path";
