import type { Metadata } from "next";

import type { Locale } from "@/features/locale/constants";
import { HTML_LANG } from "@/features/locale/constants";
import { localizePath } from "@/features/locale/lib/path";
import type { TFunction } from "@/features/locale/lib/translate";
import {
  NO_INDEX,
  breadcrumbJsonLd,
  localeAlternates,
  openGraphLocales,
} from "@/lib/seo";
import {
  DEFAULT_OG_IMAGE,
  SITE_LOGO,
  SITE_NAME,
  absoluteUrl,
  truncateText,
} from "@/lib/site";

import {
  ABOUT_PATH,
  SECTION_LABELS,
  postPath,
  sectionPath,
} from "../constants";
import type { Post } from "../types";

function isoDate(value: string): string {
  return `${value}T00:00:00+07:00`;
}

function postImage(post: Post): string {
  return post.coverUrl ? post.coverUrl : DEFAULT_OG_IMAGE;
}

export function postMetadata(post: Post, locale: Locale): Metadata {
  const path = postPath(post.section, post.slug);
  const description = truncateText(post.summary);
  const image = postImage(post);
  return {
    title: post.title,
    description,
    alternates: localeAlternates(path, locale),
    robots: post.isSample ? NO_INDEX : undefined,
    openGraph: {
      type: "article",
      url: localizePath(path, locale),
      title: post.title,
      description,
      siteName: SITE_NAME,
      ...openGraphLocales(locale),
      publishedTime: isoDate(post.publishedAt),
      authors: [post.author],
      section: post.category,
      images: [{ url: image, alt: post.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description,
      images: [image],
    },
  };
}

export function postJsonLd(
  post: Post,
  locale: Locale,
  t: TFunction,
): Record<string, unknown>[] {
  const path = postPath(post.section, post.slug);
  const url = absoluteUrl(localizePath(path, locale));
  const published = isoDate(post.publishedAt);
  const article = {
    "@context": "https://schema.org",
    "@type": "Article",
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    headline: truncateText(post.title, 110),
    description: truncateText(post.summary),
    image: [absoluteUrl(postImage(post))],
    datePublished: published,
    dateModified: published,
    inLanguage: HTML_LANG[locale],
    articleSection: post.category,
    author: { "@type": "Organization", name: post.author },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      logo: { "@type": "ImageObject", url: absoluteUrl(SITE_LOGO) },
    },
  };
  const breadcrumbs = breadcrumbJsonLd(
    [
      { name: t("Trang chủ"), path: "/" },
      { name: t("Về ESG Report Online"), path: ABOUT_PATH },
      { name: t(SECTION_LABELS[post.section]), path: sectionPath(post.section) },
      { name: post.title, path },
    ],
    locale,
  );
  return [article, breadcrumbs];
}
