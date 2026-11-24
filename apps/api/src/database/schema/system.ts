import { sql } from "drizzle-orm";
import { check, index, integer, jsonb, pgTable, text, uuid } from "drizzle-orm/pg-core";

import { createdAt, oneOf, timestamptz, updatedAt, uuidPk } from "./columns.js";
import {
  ACTOR_TYPES,
  EMAIL_STATUSES,
  JOB_STATUSES,
  type ActorType,
  type EmailStatus,
  type JobStatus,
} from "./enums.js";

export const emailOutbox = pgTable(
  "email_outbox",
  {
    id: uuidPk(),
    toEmail: text().notNull(),
    template: text().notNull(),
    payload: jsonb().$type<Record<string, unknown>>().notNull().default({}),
    status: text().$type<EmailStatus>().notNull().default("pending"),
    attempts: integer().notNull().default(0),
    nextAttemptAt: timestamptz().notNull().defaultNow(),
    sentAt: timestamptz(),
    error: text(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    check("email_outbox_status_check", oneOf(t.status, EMAIL_STATUSES)),
    index("email_outbox_pending_idx")
      .on(t.nextAttemptAt)
      .where(sql`${t.status} = 'pending'`),
    index("email_outbox_sent_at_idx")
      .on(t.sentAt)
      .where(sql`${t.status} = 'sent'`),
  ],
);

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuidPk(),
    actorType: text().$type<ActorType>().notNull(),
    actorId: uuid(),
    action: text().notNull(),
    entity: text().notNull(),
    entityId: text(),
    meta: jsonb().$type<Record<string, unknown>>().notNull().default({}),
    ipHash: text(),
    createdAt: createdAt(),
  },
  (t) => [
    check("audit_logs_actor_type_check", oneOf(t.actorType, ACTOR_TYPES)),
    index("audit_logs_created_at_idx").on(t.createdAt.desc()),
    index("audit_logs_entity_idx").on(t.entity, t.entityId),
    index("audit_logs_actor_idx").on(t.actorType, t.actorId),
  ],
);

export const jobRuns = pgTable(
  "job_runs",
  {
    id: uuidPk(),
    job: text().notNull(),
    startedAt: timestamptz().notNull().defaultNow(),
    finishedAt: timestamptz(),
    status: text().$type<JobStatus>().notNull().default("running"),
    detail: jsonb().$type<Record<string, unknown>>(),
    createdAt: createdAt(),
  },
  (t) => [
    check("job_runs_status_check", oneOf(t.status, JOB_STATUSES)),
    index("job_runs_job_started_at_idx").on(t.job, t.startedAt.desc()),
  ],
);

export const settings = pgTable("settings", {
  key: text().primaryKey(),
  value: jsonb().$type<unknown>().notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});
