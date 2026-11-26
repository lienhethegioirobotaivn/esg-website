import { postImagePath, sanitizeRichDoc, type PostSection, type RichDoc } from "@esg/shared/node";
import { sql } from "drizzle-orm";

import { postLikes, posts, type PostStatus } from "../database/schema/index.js";
import { formatPublishDate } from "./publish-date.js";

export interface PostSummary {
  id: string;
  section: PostSection;
  slug: string;
  category: string;
  title: string;
  summary: string;
  coverUrl: string;
  author: string;
  readMinutes: number;
  publishedAt: string;
  featured: boolean;
  popular: boolean;
  spotlight: boolean;
  status: PostStatus;
  likes: number;
}

export interface PostDetail extends PostSummary {
  body: RichDoc;
}

export const likesColumn = sql<number>`(${posts.likeBase} + (
  select count(*) from ${postLikes} where ${postLikes.postId} = ${posts.id}
))::int`;

export const summaryColumns = {
  id: posts.id,
  section: posts.section,
  slug: posts.slug,
  category: posts.category,
  title: posts.title,
  excerpt: posts.excerpt,
  coverFileId: posts.coverFileId,
  coverUrl: posts.coverUrl,
  authorName: posts.authorName,
  readMinutes: posts.readMinutes,
  publishedAt: posts.publishedAt,
  createdAt: posts.createdAt,
  updatedAt: posts.updatedAt,
  featured: posts.featured,
  popular: posts.popular,
  spotlight: posts.spotlight,
  status: posts.status,
  likes: likesColumn,
};

export const detailColumns = { ...summaryColumns, body: posts.body };

export interface PostRow {
  id: string;
  section: PostSection;
  slug: string;
  category: string;
  title: string;
  excerpt: string | null;
  coverFileId: string | null;
  coverUrl: string | null;
  authorName: string;
  readMinutes: number;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  featured: boolean;
  popular: boolean;
  spotlight: boolean;
  status: PostStatus;
  likes: number;
}

export function toSummary(row: PostRow): PostSummary {
  return {
    id: row.id,
    section: row.section,
    slug: row.slug,
    category: row.category,
    title: row.title,
    summary: row.excerpt ?? "",
    coverUrl: row.coverFileId === null ? (row.coverUrl ?? "") : postImagePath(row.coverFileId),
    author: row.authorName,
    readMinutes: row.readMinutes,
    publishedAt: formatPublishDate(row.publishedAt ?? row.createdAt),
    featured: row.featured,
    popular: row.popular,
    spotlight: row.spotlight,
    status: row.status,
    likes: row.likes,
  };
}

export function toDetail(row: PostRow & { body: unknown }): PostDetail {
  return { ...toSummary(row), body: sanitizeRichDoc(row.body) };
}
