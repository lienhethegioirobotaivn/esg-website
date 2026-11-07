export type PostSection = "thanh-tuu" | "tin-tuc";

export type PostBlock =
  | { type: "paragraph"; text: string }
  | { type: "heading"; text: string }
  | { type: "callout"; title: string; text: string };

export interface Post {
  id: string;
  slug: string;
  section: PostSection;
  category: string;
  title: string;
  summary: string;
  coverUrl: string | null;
  author: string;
  readMinutes: number;
  publishedAt: string;
  likes: number;
  featured: boolean;
  popular: boolean;
  spotlight: boolean;
  isSample: boolean;
  body: PostBlock[];
}

export interface Stat {
  id: string;
  value: string;
  label: string;
}

export interface AchievementStats {
  items: Stat[];
  isSample: boolean;
}
