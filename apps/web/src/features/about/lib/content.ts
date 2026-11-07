import { SAMPLE_STATS } from "../data/sample-stats";
import { SAMPLE_ACHIEVEMENTS, SAMPLE_NEWS } from "../data/sample-posts";
import type { AchievementStats, Post, PostSection } from "../types";

function byNewest(a: Post, b: Post): number {
  return b.publishedAt.localeCompare(a.publishedAt);
}

export async function getPosts(section: PostSection): Promise<Post[]> {
  const source = section === "tin-tuc" ? SAMPLE_NEWS : SAMPLE_ACHIEVEMENTS;
  return [...source].sort(byNewest);
}

export async function getPost(
  section: PostSection,
  slug: string,
): Promise<Post | null> {
  const posts = await getPosts(section);
  return posts.find((post) => post.slug === slug) ?? null;
}

export async function getAchievementStats(): Promise<AchievementStats> {
  return SAMPLE_STATS;
}
