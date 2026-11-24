import {
  check,
  index,
  jsonb,
  pgTable,
  primaryKey,
  text,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

import { adminUsers } from "./auth.js";
import { createdAt, oneOf, timestamptz, updatedAt, uuidPk } from "./columns.js";
import {
  LOCALES,
  POST_STATUSES,
  TRANSLATION_LOCALES,
  type Locale,
  type PostStatus,
  type TranslationLocale,
} from "./enums.js";
import { files } from "./files.js";

export const posts = pgTable(
  "posts",
  {
    id: uuidPk(),
    slug: text().notNull(),
    locale: text().$type<Locale>().notNull(),
    title: text().notNull(),
    excerpt: text(),
    body: jsonb().$type<Record<string, unknown>>().notNull(),
    coverFileId: uuid().references(() => files.id, { onDelete: "set null" }),
    status: text().$type<PostStatus>().notNull().default("draft"),
    publishedAt: timestamptz(),
    authorAdminId: uuid().references(() => adminUsers.id, { onDelete: "set null" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    check("posts_locale_check", oneOf(t.locale, LOCALES)),
    check("posts_status_check", oneOf(t.status, POST_STATUSES)),
    uniqueIndex("posts_slug_locale_key").on(t.slug, t.locale),
    index("posts_status_published_at_idx").on(t.status, t.publishedAt.desc()),
    index("posts_cover_file_id_idx").on(t.coverFileId),
  ],
);

export const postFiles = pgTable(
  "post_files",
  {
    postId: uuid()
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    fileId: uuid()
      .notNull()
      .references(() => files.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (t) => [
    primaryKey({ name: "post_files_pkey", columns: [t.postId, t.fileId] }),
    index("post_files_file_id_idx").on(t.fileId),
  ],
);

export const postLikes = pgTable(
  "post_likes",
  {
    postId: uuid()
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    voterKeyHash: text().notNull(),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ name: "post_likes_pkey", columns: [t.postId, t.voterKeyHash] })],
);

export const siteStats = pgTable("site_stats", {
  key: text().primaryKey(),
  value: jsonb().$type<unknown>().notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const translations = pgTable(
  "translations",
  {
    sourceHash: text().notNull(),
    locale: text().$type<TranslationLocale>().notNull(),
    sourceText: text().notNull(),
    autoText: text(),
    manualText: text(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    primaryKey({ name: "translations_pkey", columns: [t.sourceHash, t.locale] }),
    check("translations_locale_check", oneOf(t.locale, TRANSLATION_LOCALES)),
    check("translations_source_hash_check", sql`${t.sourceHash} ~ '^[0-9a-f]{16}$'`),
  ],
);
