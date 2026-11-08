import type { MetadataRoute } from "next";

import { ABOUT_PATH, postPath } from "@/features/about/constants";
import { getPosts } from "@/features/about/lib/content";
import { absoluteUrl } from "@/lib/site";

export const dynamic = "force-dynamic";

async function loadPostEntries(): Promise<MetadataRoute.Sitemap> {
  const [achievements, news] = await Promise.all([
    getPosts("thanh-tuu").catch(() => []),
    getPosts("tin-tuc").catch(() => []),
  ]);
  return [...achievements, ...news]
    .filter((post) => !post.isSample)
    .map((post) => ({
      url: absoluteUrl(postPath(post.section, post.slug)),
      lastModified: new Date(`${post.publishedAt}T00:00:00+07:00`),
      changeFrequency: "monthly" as const,
      priority: 0.6,
      ...(post.coverUrl ? { images: [post.coverUrl] } : {}),
    }));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await loadPostEntries();
  const newest = posts.reduce<Date | undefined>(
    (latest, entry) =>
      entry.lastModified instanceof Date &&
      (!latest || entry.lastModified > latest)
        ? entry.lastModified
        : latest,
    undefined,
  );
  return [
    {
      url: absoluteUrl("/"),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: absoluteUrl(ABOUT_PATH),
      ...(newest ? { lastModified: newest } : {}),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: absoluteUrl(`${ABOUT_PATH}/tin-tuc`),
      ...(newest ? { lastModified: newest } : {}),
      changeFrequency: "daily",
      priority: 0.8,
    },
    ...posts,
  ];
}
