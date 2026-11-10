import type { MetadataRoute } from "next";

import { ABOUT_PATH, postPath } from "@/features/about/constants";
import { getPosts } from "@/features/about/lib/content";
import { INDEXABLE_LOCALES } from "@/features/locale/constants";
import { localizePath } from "@/features/locale/lib/path";
import { localeLanguages } from "@/lib/seo";
import { absoluteUrl } from "@/lib/site";

export const dynamic = "force-dynamic";

type Entry = MetadataRoute.Sitemap[number];

interface PageEntry {
  path: string;
  lastModified?: Date;
  changeFrequency: NonNullable<Entry["changeFrequency"]>;
  priority: number;
  images?: string[];
}

function expand(page: PageEntry): MetadataRoute.Sitemap {
  const languages = Object.fromEntries(
    Object.entries(localeLanguages(page.path)).map(([key, value]) => [
      key,
      absoluteUrl(value),
    ]),
  );
  return INDEXABLE_LOCALES.map((locale) => ({
    url: absoluteUrl(localizePath(page.path, locale)),
    ...(page.lastModified ? { lastModified: page.lastModified } : {}),
    changeFrequency: page.changeFrequency,
    priority: page.priority,
    ...(page.images ? { images: page.images } : {}),
    alternates: { languages },
  }));
}

async function loadPostPages(): Promise<PageEntry[]> {
  const [achievements, news] = await Promise.all([
    getPosts("thanh-tuu").catch(() => []),
    getPosts("tin-tuc").catch(() => []),
  ]);
  return [...achievements, ...news]
    .filter((post) => !post.isSample)
    .map((post) => ({
      path: postPath(post.section, post.slug),
      lastModified: new Date(`${post.publishedAt}T00:00:00+07:00`),
      changeFrequency: "monthly" as const,
      priority: 0.6,
      ...(post.coverUrl ? { images: [post.coverUrl] } : {}),
    }));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await loadPostPages();
  const newest = posts.reduce<Date | undefined>(
    (latest, entry) =>
      entry.lastModified && (!latest || entry.lastModified > latest)
        ? entry.lastModified
        : latest,
    undefined,
  );
  const pages: PageEntry[] = [
    { path: "/", changeFrequency: "weekly", priority: 1 },
    {
      path: ABOUT_PATH,
      ...(newest ? { lastModified: newest } : {}),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      path: `${ABOUT_PATH}/tin-tuc`,
      ...(newest ? { lastModified: newest } : {}),
      changeFrequency: "daily",
      priority: 0.8,
    },
    ...posts,
  ];
  return pages.flatMap(expand);
}
