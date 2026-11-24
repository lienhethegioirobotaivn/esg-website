import { getTableName, is } from "drizzle-orm";
import { PgTable } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";

import * as schema from "./index.js";

function listTableNames(): string[] {
  return Object.values<unknown>(schema)
    .filter((value): value is PgTable => is(value, PgTable))
    .map((table) => getTableName(table));
}

const EXPECTED_TABLES = [
  "admin_sessions",
  "admin_users",
  "audit_logs",
  "companies",
  "consents",
  "email_outbox",
  "evidence_files",
  "feedbacks",
  "files",
  "inquiries",
  "inquiry_notes",
  "job_runs",
  "otp_challenges",
  "post_files",
  "post_likes",
  "posts",
  "question_banks",
  "question_groups",
  "question_texts",
  "questions",
  "rate_limits",
  "report_drafts",
  "report_exports",
  "reports",
  "settings",
  "site_stats",
  "translations",
  "user_sessions",
  "users",
];

describe("schema Drizzle", () => {
  it("khai báo đủ các bảng theo backend-database.md", () => {
    expect(listTableNames().sort()).toEqual(EXPECTED_TABLES);
  });

  it("chưa tạo evidence_reviews và upload_sessions", () => {
    const tables = listTableNames();

    expect(tables).not.toContain("evidence_reviews");
    expect(tables).not.toContain("upload_sessions");
  });

  it("trạng thái yêu cầu tư vấn khớp 9 giá trị của Sheet", () => {
    expect(schema.INQUIRY_STATUSES).toEqual([
      "new",
      "contacting",
      "awaiting_customer",
      "scheduled",
      "quoted",
      "in_progress",
      "done",
      "declined",
      "invalid",
    ]);
    expect(schema.INQUIRY_PRIORITIES).toEqual(["normal", "high", "urgent"]);
  });
});
