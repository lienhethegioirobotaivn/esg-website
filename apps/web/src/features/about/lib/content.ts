import "server-only";

import { postInputSchema, statItemSchema } from "@esg/shared";
import { z } from "zod";

import { callAbout, isAboutBridgeConfigured } from "@/server/about/bridge";

import { SAMPLE_STATS } from "../data/sample-stats";
import { SAMPLE_ACHIEVEMENTS, SAMPLE_NEWS } from "../data/sample-posts";
import type { AchievementStats, Post, PostSection } from "../types";

const CACHE_TTL_MS = 60_000;

const storedPostSchema = postInputSchema.extend({
  id: z.string().min(1),
  likes: z.number().int().min(0),
});

interface ContentCache {
  published: { at: number; posts: Post[] } | null;
  stats: { at: number; stats: AchievementStats | null } | null;
}

const shared = globalThis as typeof globalThis & {
  __esgAboutCache?: ContentCache;
};
const cache: ContentCache = (shared.__esgAboutCache ??= {
  published: null,
  stats: null,
});

function byNewest(a: Post, b: Post): number {
  return b.publishedAt.localeCompare(a.publishedAt);
}

function toPost(value: z.infer<typeof storedPostSchema>): Post {
  return {
    id: value.id,
    slug: value.slug,
    section: value.section,
    category: value.category,
    title: value.title,
    summary: value.summary,
    coverUrl: value.coverUrl === "" ? null : value.coverUrl,
    author: value.author,
    readMinutes: value.readMinutes,
    publishedAt: value.publishedAt,
    likes: value.likes,
    featured: value.featured,
    popular: value.popular,
    spotlight: value.spotlight,
    status: value.status,
    isSample: false,
    body: value.body,
  };
}

function parsePosts(raw: unknown): Post[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const posts: Post[] = [];
  for (const item of raw) {
    const result = storedPostSchema.safeParse(item);
    if (result.success) {
      posts.push(toPost(result.data));
    } else {
      console.error("Bỏ qua bài viết lỗi dữ liệu:", result.error.issues[0]?.message);
    }
  }
  return posts.sort(byNewest);
}

export function clearContentCache(): void {
  cache.published = null;
  cache.stats = null;
}

async function loadPublished(): Promise<Post[]> {
  if (cache.published && Date.now() - cache.published.at < CACHE_TTL_MS) {
    return cache.published.posts;
  }
  try {
    const response = await callAbout("listPosts", { includeDrafts: false });
    const posts = parsePosts(response["posts"]);
    cache.published = { at: Date.now(), posts };
    return posts;
  } catch (error) {
    console.error(error);
    return cache.published?.posts ?? [];
  }
}

export async function getPosts(section: PostSection): Promise<Post[]> {
  if (!isAboutBridgeConfigured()) {
    const source = section === "tin-tuc" ? SAMPLE_NEWS : SAMPLE_ACHIEVEMENTS;
    return [...source].sort(byNewest);
  }
  const posts = await loadPublished();
  return posts.filter((post) => post.section === section);
}

export async function getPost(
  section: PostSection,
  slug: string,
): Promise<Post | null> {
  const posts = await getPosts(section);
  return posts.find((post) => post.slug === slug) ?? null;
}

export async function getAchievementStats(): Promise<AchievementStats | null> {
  if (!isAboutBridgeConfigured()) {
    return SAMPLE_STATS;
  }
  if (cache.stats && Date.now() - cache.stats.at < CACHE_TTL_MS) {
    return cache.stats.stats;
  }
  try {
    const response = await callAbout("listStats");
    const items = z.array(statItemSchema).safeParse(response["items"]);
    const stats: AchievementStats | null =
      items.success && items.data.length > 0
        ? {
            isSample: false,
            items: items.data.map((item, index) => ({
              id: `stat-${index}`,
              value: item.value,
              label: item.label,
            })),
          }
        : null;
    cache.stats = { at: Date.now(), stats };
    return stats;
  } catch (error) {
    console.error(error);
    return cache.stats?.stats ?? null;
  }
}

export async function getAdminPosts(): Promise<Post[]> {
  if (!isAboutBridgeConfigured()) {
    return [];
  }
  const response = await callAbout("listPosts", { includeDrafts: true });
  return parsePosts(response["posts"]);
}

export async function getAdminStats(): Promise<{ value: string; label: string }[]> {
  if (!isAboutBridgeConfigured()) {
    return [];
  }
  const response = await callAbout("listStats");
  const items = z.array(statItemSchema).safeParse(response["items"]);
  return items.success ? items.data : [];
}
