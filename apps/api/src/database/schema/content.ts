import {
  boolean,
  check,
  index,
  integer,
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
  POST_SECTION_CODES,
  POST_STATUSES,
  TRANSLATION_LOCALES,
  type Locale,
  type PostSectionCode,
  type PostStatus,
  type TranslationLocale,
} from "./enums.js";
import { files } from "./files.js";

export const posts = pgTable(
  "posts",
  {
    id: uuidPk(),
    slug: text().notNull(),
    locale: text().$type<Locale>().notNull().default("vi"),
    section: text().$type<PostSectionCode>().notNull().default("tin-tuc"),
    category: text().notNull().default(""),
    authorName: text().notNull().default(""),
    readMinutes: integer().notNull().default(1),
    featured: boolean().notNull().default(false),
    popular: boolean().notNull().default(false),
    spotlight: boolean().notNull().default(false),
    likeBase: integer().notNull().default(0),
    legacyCode: text().unique("posts_legacy_code_key"),
    title: text().notNull(),
    excerpt: text(),
    body: jsonb().$type<Record<string, unknown>>().notNull(),
    coverFileId: uuid().references(() => files.id, { onDelete: "set null" }),
    coverUrl: text(),
    status: text().$type<PostStatus>().notNull().default("draft"),
    publishedAt: timestamptz(),
    authorAdminId: uuid().references(() => adminUsers.id, { onDelete: "set null" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    check("posts_locale_check", oneOf(t.locale, LOCALES)),
    check("posts_status_check", oneOf(t.status, POST_STATUSES)),
    check("posts_section_check", oneOf(t.section, POST_SECTION_CODES)),
    check("posts_read_minutes_check", sql`${t.readMinutes} between 1 and 120`),
    check("posts_like_base_check", sql`${t.likeBase} >= 0`),
    uniqueIndex("posts_locale_section_slug_key").on(t.locale, t.section, t.slug),
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
    failedAttempts: integer().notNull().default(0),
    retryAfter: timestamptz(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    primaryKey({ name: "translations_pkey", columns: [t.sourceHash, t.locale] }),
    check("translations_locale_check", oneOf(t.locale, TRANSLATION_LOCALES)),
    check("translations_source_hash_check", sql`${t.sourceHash} ~ '^[0-9a-f]{16}$'`),
  ],
);
