import { sql } from "drizzle-orm";
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

import { createdAt, oneOf, timestamptz, updatedAt, uuidPk } from "./columns.js";
import {
  LOCALES,
  QUESTION_BANK_STATUSES,
  QUESTION_PILLARS,
  QUESTION_REVIEW_STATUSES,
  QUESTION_SOURCES,
  QUESTION_TIERS,
  QUESTION_TRACKS,
  type Locale,
  type QuestionBankStatus,
  type QuestionPillar,
  type QuestionReviewStatus,
  type QuestionSource,
  type QuestionTier,
  type QuestionTrack,
} from "./enums.js";

export const questionBanks = pgTable(
  "question_banks",
  {
    id: uuidPk(),
    version: text().notNull().unique("question_banks_version_key"),
    status: text().$type<QuestionBankStatus>().notNull().default("draft"),
    publishedAt: timestamptz(),
    note: text(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    check("question_banks_status_check", oneOf(t.status, QUESTION_BANK_STATUSES)),
    uniqueIndex("question_banks_single_published_idx")
      .on(t.status)
      .where(sql`${t.status} = 'published'`),
  ],
);

export const questionGroups = pgTable(
  "question_groups",
  {
    id: uuidPk(),
    bankId: uuid()
      .notNull()
      .references(() => questionBanks.id, { onDelete: "cascade" }),
    code: text().notNull(),
    title: text().notNull(),
    position: integer().notNull(),
    track: text().$type<QuestionTrack>().notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    check("question_groups_track_check", oneOf(t.track, QUESTION_TRACKS)),
    uniqueIndex("question_groups_bank_code_key").on(t.bankId, t.code),
    index("question_groups_bank_position_idx").on(t.bankId, t.position),
  ],
);

export const questions = pgTable(
  "questions",
  {
    id: uuidPk(),
    bankId: uuid()
      .notNull()
      .references(() => questionBanks.id, { onDelete: "cascade" }),
    groupId: uuid()
      .notNull()
      .references(() => questionGroups.id, { onDelete: "cascade" }),
    code: text().notNull(),
    source: text().$type<QuestionSource>().notNull(),
    pillar: text().$type<QuestionPillar>(),
    topic: text(),
    inputType: text().notNull(),
    unit: text(),
    required: boolean().notNull().default(true),
    text: text().notNull(),
    guidance: text(),
    evidenceHint: text(),
    improvementHint: text(),
    reportSection: text(),
    declarationLevel: text().$type<QuestionTier>().notNull(),
    route: jsonb().$type<Record<string, unknown>>().notNull().default({}),
    evidenceRule: jsonb().$type<Record<string, unknown>>(),
    reviewStatus: text().$type<QuestionReviewStatus>().notNull().default("pending"),
    position: integer().notNull(),
    sourceRef: text(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    check("questions_source_check", oneOf(t.source, QUESTION_SOURCES)),
    check(
      "questions_pillar_check",
      sql`${t.pillar} is null or ${t.pillar} in (${sql.raw(QUESTION_PILLARS.map((value) => `'${value}'`).join(", "))})`,
    ),
    check("questions_declaration_level_check", oneOf(t.declarationLevel, QUESTION_TIERS)),
    check("questions_review_status_check", oneOf(t.reviewStatus, QUESTION_REVIEW_STATUSES)),
    uniqueIndex("questions_bank_code_key").on(t.bankId, t.code),
    index("questions_bank_group_position_idx").on(t.bankId, t.groupId, t.position),
  ],
);

export const questionTexts = pgTable(
  "question_texts",
  {
    questionId: uuid()
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),
    locale: text().$type<Locale>().notNull(),
    text: text().notNull(),
    guidance: text(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    primaryKey({ name: "question_texts_pkey", columns: [t.questionId, t.locale] }),
    check("question_texts_locale_check", oneOf(t.locale, LOCALES)),
  ],
);
