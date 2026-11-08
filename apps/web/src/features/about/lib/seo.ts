import type { Metadata } from "next";

import { NO_INDEX, breadcrumbJsonLd } from "@/lib/seo";
import {
  DEFAULT_OG_IMAGE,
  SITE_LOCALE,
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

export function postMetadata(post: Post): Metadata {
  const path = postPath(post.section, post.slug);
  const description = truncateText(post.summary);
  const image = postImage(post);
  return {
    title: post.title,
    description,
    alternates: { canonical: path },
    robots: post.isSample ? NO_INDEX : undefined,
    openGraph: {
      type: "article",
      url: path,
      title: post.title,
      description,
      siteName: SITE_NAME,
      locale: SITE_LOCALE,
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

export function postJsonLd(post: Post): Record<string, unknown>[] {
  const path = postPath(post.section, post.slug);
  const url = absoluteUrl(path);
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
    inLanguage: "vi-VN",
    articleSection: post.category,
    author: { "@type": "Organization", name: post.author },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      logo: { "@type": "ImageObject", url: absoluteUrl(SITE_LOGO) },
    },
  };
  const breadcrumbs = breadcrumbJsonLd([
    { name: "Trang chủ", path: "/" },
    { name: "Về ESG Report Online", path: ABOUT_PATH },
    { name: SECTION_LABELS[post.section], path: sectionPath(post.section) },
    { name: post.title, path },
  ]);
  return [article, breadcrumbs];
}
