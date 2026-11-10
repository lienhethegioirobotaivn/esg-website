import type { Metadata } from "next";

import {
  DEFAULT_LOCALE,
  HTML_LANG,
  INDEXABLE_LOCALES,
  LOCALES,
  OG_LOCALE,
} from "@/features/locale/constants";
import type { Locale } from "@/features/locale/constants";
import { localizePath } from "@/features/locale/lib/path";

import { DEFAULT_OG_IMAGE, SITE_NAME, absoluteUrl, truncateText } from "./site";

interface PageMetadataInput {
  title: string;
  description: string;
  path: string;
  locale: Locale;
  image?: string;
  absoluteTitle?: boolean;
}

export function localeLanguages(path: string): Record<string, string> {
  const languages: Record<string, string> = {};
  for (const locale of INDEXABLE_LOCALES) {
    languages[HTML_LANG[locale]] = localizePath(path, locale);
  }
  languages["x-default"] = localizePath(path, DEFAULT_LOCALE);
  return languages;
}

export function localeAlternates(
  path: string,
  locale: Locale,
): NonNullable<Metadata["alternates"]> {
  return {
    canonical: localizePath(path, locale),
    languages: localeLanguages(path),
  };
}

export function openGraphLocales(locale: Locale): {
  locale: string;
  alternateLocale: string[];
} {
  return {
    locale: OG_LOCALE[locale],
    alternateLocale: LOCALES.filter((other) => other !== locale).map(
      (other) => OG_LOCALE[other],
    ),
  };
}

export function pageMetadata({
  title,
  description,
  path,
  locale,
  image = DEFAULT_OG_IMAGE,
  absoluteTitle = false,
}: PageMetadataInput): Metadata {
  const summary = truncateText(description);
  const localizedPath = localizePath(path, locale);
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description: summary,
    alternates: localeAlternates(path, locale),
    openGraph: {
      type: "website",
      url: localizedPath,
      title,
      description: summary,
      siteName: SITE_NAME,
      ...openGraphLocales(locale),
      images: [{ url: image, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: summary,
      images: [image],
    },
  };
}

export interface BreadcrumbItem {
  name: string;
  path: string;
}

export function breadcrumbJsonLd(items: BreadcrumbItem[], locale: Locale) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(localizePath(item.path, locale)),
    })),
  };
}

export const NO_INDEX: Metadata["robots"] = { index: false, follow: true };
