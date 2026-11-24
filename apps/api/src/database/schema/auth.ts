import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  uuid,
} from "drizzle-orm/pg-core";

import { createdAt, oneOf, timestamptz, updatedAt, uuidPk } from "./columns.js";
import { ADMIN_ROLES, OTP_PURPOSES, type AdminRole, type OtpPurpose } from "./enums.js";

export const users = pgTable(
  "users",
  {
    id: uuidPk(),
    email: text().notNull().unique("users_email_key"),
    emailVerifiedAt: timestamptz(),
    lastLoginAt: timestamptz(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [check("users_email_lowercase", sql`${t.email} = lower(${t.email})`)],
);

export const userSessions = pgTable(
  "user_sessions",
  {
    id: uuidPk(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text().notNull().unique("user_sessions_token_hash_key"),
    expiresAt: timestamptz().notNull(),
    userAgent: text(),
    ipHash: text(),
    createdAt: createdAt(),
  },
  (t) => [
    index("user_sessions_user_id_idx").on(t.userId),
    index("user_sessions_expires_at_idx").on(t.expiresAt),
  ],
);

export const otpChallenges = pgTable(
  "otp_challenges",
  {
    id: uuidPk(),
    email: text().notNull(),
    codeHash: text().notNull(),
    purpose: text().$type<OtpPurpose>().notNull().default("email_verification"),
    expiresAt: timestamptz().notNull(),
    attempts: integer().notNull().default(0),
    consumedAt: timestamptz(),
    createdAt: createdAt(),
  },
  (t) => [
    check("otp_challenges_email_lowercase", sql`${t.email} = lower(${t.email})`),
    check("otp_challenges_purpose_check", oneOf(t.purpose, OTP_PURPOSES)),
    index("otp_challenges_email_created_at_idx").on(t.email, t.createdAt.desc()),
  ],
);

export const rateLimits = pgTable(
  "rate_limits",
  {
    key: text().notNull(),
    windowStart: timestamptz().notNull(),
    hits: integer().notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [
    primaryKey({ name: "rate_limits_pkey", columns: [t.key, t.windowStart] }),
    index("rate_limits_window_start_idx").on(t.windowStart),
  ],
);

export const adminUsers = pgTable(
  "admin_users",
  {
    id: uuidPk(),
    email: text().notNull().unique("admin_users_email_key"),
    name: text().notNull(),
    passwordHash: text().notNull(),
    role: text().$type<AdminRole>().notNull(),
    active: boolean().notNull().default(true),
    failedAttempts: integer().notNull().default(0),
    lockedUntil: timestamptz(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    check("admin_users_email_lowercase", sql`${t.email} = lower(${t.email})`),
    check("admin_users_role_check", oneOf(t.role, ADMIN_ROLES)),
  ],
);

export const adminSessions = pgTable(
  "admin_sessions",
  {
    id: uuidPk(),
    adminId: uuid()
      .notNull()
      .references(() => adminUsers.id, { onDelete: "cascade" }),
    tokenHash: text().notNull().unique("admin_sessions_token_hash_key"),
    expiresAt: timestamptz().notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    index("admin_sessions_admin_id_idx").on(t.adminId),
    index("admin_sessions_expires_at_idx").on(t.expiresAt),
  ],
);
