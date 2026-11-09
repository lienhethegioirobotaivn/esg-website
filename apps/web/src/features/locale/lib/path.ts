import { DEFAULT_LOCALE, LOCALES, isLocale } from "../constants";
import type { Locale } from "../constants";

function splitSuffix(path: string): [string, string] {
  const index = path.search(/[?#]/);
  return index === -1 ? [path, ""] : [path.slice(0, index), path.slice(index)];
}

export function getPathLocale(pathname: string): Locale | null {
  const segment = pathname.split("/")[1] ?? "";
  return isLocale(segment) ? segment : null;
}

export function getLocaleFromPathname(pathname: string): Locale {
  const found = getPathLocale(pathname);
  return found !== null && found !== DEFAULT_LOCALE ? found : DEFAULT_LOCALE;
}

export function stripLocalePrefix(pathname: string): string {
  for (const locale of LOCALES) {
    if (pathname === `/${locale}`) {
      return "/";
    }
    if (pathname.startsWith(`/${locale}/`)) {
      return pathname.slice(locale.length + 1);
    }
  }
  return pathname;
}

export function localizePath(path: string, locale: Locale): string {
  if (!path.startsWith("/") || path.startsWith("//")) {
    return path;
  }
  const [pathname, suffix] = splitSuffix(path);
  const bare = stripLocalePrefix(pathname);
  if (locale === DEFAULT_LOCALE) {
    return `${bare}${suffix}`;
  }
  return `${bare === "/" ? `/${locale}` : `/${locale}${bare}`}${suffix}`;
}
