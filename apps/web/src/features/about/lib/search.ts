import type { Post } from "../types";

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replaceAll("đ", "d")
    .replaceAll("Đ", "D")
    .toLowerCase();
}

export function matchesQuery(post: Post, query: string): boolean {
  const needle = normalize(query.trim());
  if (needle === "") {
    return true;
  }
  return normalize(`${post.title} ${post.summary} ${post.category}`).includes(
    needle,
  );
}

export function pageCount(total: number, pageSize: number): number {
  return Math.max(1, Math.ceil(total / pageSize));
}
