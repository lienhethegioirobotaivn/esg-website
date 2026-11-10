import "server-only";

import type { Locale } from "@/features/locale";

import { collectRichTexts, applyRichTexts } from "./translate-rich";
import { translateTexts } from "./translate-texts";

interface TranslatablePost {
  title: string;
  summary: string;
  body: unknown;
}

export async function translatePostsLite<T extends TranslatablePost>(
  posts: readonly T[],
  locale: Locale,
): Promise<T[]> {
  if (locale === "vi" || posts.length === 0) {
    return [...posts];
  }
  const map = await translateTexts(
    locale,
    posts.flatMap((post) => [post.title, post.summary]),
  );
  return posts.map((post) => ({
    ...post,
    title: map.get(post.title) ?? post.title,
    summary: map.get(post.summary) ?? post.summary,
  }));
}

export async function translatePostFull<T extends TranslatablePost>(
  post: T,
  locale: Locale,
): Promise<T> {
  if (locale === "vi") {
    return post;
  }
  const map = await translateTexts(locale, [
    post.title,
    post.summary,
    ...collectRichTexts(post.body),
  ]);
  if (map.size === 0) {
    return post;
  }
  return {
    ...post,
    title: map.get(post.title) ?? post.title,
    summary: map.get(post.summary) ?? post.summary,
    body: applyRichTexts(post.body, map),
  };
}

export async function translateLabels<T extends { label: string }>(
  items: readonly T[],
  locale: Locale,
): Promise<T[]> {
  if (locale === "vi" || items.length === 0) {
    return [...items];
  }
  const map = await translateTexts(
    locale,
    items.map((item) => item.label),
  );
  return items.map((item) => ({ ...item, label: map.get(item.label) ?? item.label }));
}
