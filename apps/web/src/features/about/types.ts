import type { PostBlock, PostSection, PostStatus, RichDoc } from "@esg/shared";

export type { PostBlock, PostSection, PostStatus, RichDoc };

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
  status: PostStatus;
  isSample: boolean;
  body: RichDoc;
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
