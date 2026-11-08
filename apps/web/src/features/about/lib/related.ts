import type { Post } from "../types";

const LONG_ARTICLE_SIZE = 3000;
const SHORT_LIMIT = 2;
const LONG_LIMIT = 3;

export function relatedLimit(post: Post): number {
  return JSON.stringify(post.body).length > LONG_ARTICLE_SIZE
    ? LONG_LIMIT
    : SHORT_LIMIT;
}

function byNewest(a: Post, b: Post): number {
  return b.publishedAt.localeCompare(a.publishedAt);
}

export function pickRelatedPosts(current: Post, candidates: Post[]): Post[] {
  const others = candidates
    .filter(
      (item) => item.id !== current.id && item.section === current.section,
    )
    .sort(byNewest);
  const sameCategory = others.filter(
    (item) => item.category === current.category,
  );
  const rest = others.filter((item) => item.category !== current.category);
  return [...sameCategory, ...rest].slice(0, relatedLimit(current));
}
