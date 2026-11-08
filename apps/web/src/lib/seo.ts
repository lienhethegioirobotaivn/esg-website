import type { Metadata } from "next";

import {
  DEFAULT_OG_IMAGE,
  SITE_LOCALE,
  SITE_NAME,
  absoluteUrl,
  truncateText,
} from "./site";

interface PageMetadataInput {
  title: string;
  description: string;
  path: string;
  image?: string;
  absoluteTitle?: boolean;
}

export function pageMetadata({
  title,
  description,
  path,
  image = DEFAULT_OG_IMAGE,
  absoluteTitle = false,
}: PageMetadataInput): Metadata {
  const summary = truncateText(description);
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description: summary,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      url: path,
      title,
      description: summary,
      siteName: SITE_NAME,
      locale: SITE_LOCALE,
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

export function breadcrumbJsonLd(items: BreadcrumbItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export const NO_INDEX: Metadata["robots"] = { index: false, follow: true };
