import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { runMigrations } from "../src/database/migrate.js";
import { createTemporaryDatabase, type TemporaryDatabase } from "./helpers/test-database.js";

let database: TemporaryDatabase;

async function expectPgError(promise: Promise<unknown>, code: string): Promise<void> {
  await expect(promise).rejects.toMatchObject({ code });
}

async function insertBank(version: string, status: string): Promise<string> {
  const result = await database.pool.query<{ id: string }>(
    "insert into question_banks (version, status) values ($1, $2) returning id",
    [version, status],
  );
  return result.rows[0]?.id ?? "";
}

async function insertUser(email: string): Promise<string> {
  const result = await database.pool.query<{ id: string }>(
    "insert into users (email) values ($1) returning id",
    [email],
  );
  return result.rows[0]?.id ?? "";
}

beforeAll(async () => {
  database = await createTemporaryDatabase();
  await runMigrations(database.pool);
});

afterAll(async () => {
  await database.drop();
});

describe("migration đầu tiên trên PostgreSQL", () => {
  it("chạy trên PostgreSQL 18", async () => {
    const result = await database.pool.query<{ major: string }>(
      "select current_setting('server_version_num')::int / 10000 as major",
    );

    expect(Number(result.rows[0]?.major)).toBe(18);
  });

  it("tạo đủ 29 bảng và chạy lại không lỗi", async () => {
    await runMigrations(database.pool);

    const tables = await database.pool.query<{ table_name: string }>(
      "select table_name from information_schema.tables where table_schema = 'public' and table_type = 'BASE TABLE'",
    );
    const applied = await database.pool.query<{ count: string }>(
      "select count(*) from drizzle.__drizzle_migrations",
    );

    expect(tables.rowCount).toBe(29);
    expect(Number(applied.rows[0]?.count)).toBe(2);
  });

  it("hai tiến trình chạy migration cùng lúc không xung đột", async () => {
    const other = await createTemporaryDatabase();
    try {
      await Promise.all([runMigrations(other.pool), runMigrations(other.pool)]);
      const applied = await other.pool.query<{ count: string }>(
        "select count(*) from drizzle.__drizzle_migrations",
      );
      expect(Number(applied.rows[0]?.count)).toBe(2);
    } finally {
      await other.drop();
    }
  });

  it("sinh UUIDv7 mặc định cho khóa chính", async () => {
    const id = await insertUser("uuid@example.com");

    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });
});

describe("ràng buộc dữ liệu", () => {
  it("email người dùng phải chữ thường và duy nhất", async () => {
    await insertUser("lower@example.com");

    await expectPgError(insertUser("Upper@Example.com"), "23514");
    await expectPgError(insertUser("lower@example.com"), "23505");
  });

  it("xóa người dùng xóa theo phiên nhưng giữ doanh nghiệp (set null)", async () => {
    const userId = await insertUser("cascade@example.com");
    await database.pool.query(
      "insert into user_sessions (user_id, token_hash, expires_at) values ($1, 'hash-cascade', now() + interval '1 day')",
      [userId],
    );
    const company = await database.pool.query<{ id: string }>(
      "insert into companies (user_id, legal_name) values ($1, 'Công ty thử') returning id",
      [userId],
    );

    await database.pool.query("delete from users where id = $1", [userId]);

    const sessions = await database.pool.query("select 1 from user_sessions where user_id = $1", [
      userId,
    ]);
    const kept = await database.pool.query<{ user_id: string | null }>(
      "select user_id from companies where id = $1",
      [company.rows[0]?.id],
    );
    expect(sessions.rowCount).toBe(0);
    expect(kept.rows[0]?.user_id).toBeNull();
  });

  it("chỉ cho một ngân hàng câu hỏi ở trạng thái published", async () => {
    await insertBank("t-1", "published");
    await insertBank("t-2", "draft");
    await insertBank("t-3", "archived");
    await insertBank("t-4", "archived");

    await expectPgError(insertBank("t-5", "published"), "23505");
    await expectPgError(insertBank("t-6", "unknown"), "23514");
  });

  it("câu hỏi trùng mã trong cùng ngân hàng bị từ chối", async () => {
    const bankId = await insertBank("t-q", "draft");
    const group = await database.pool.query<{ id: string }>(
      "insert into question_groups (bank_id, code, title, position, track) values ($1, 'P-G01', 'Nhóm', 1, 'profile') returning id",
      [bankId],
    );
    const groupId = group.rows[0]?.id;
    const insertQuestion = () =>
      database.pool.query(
        "insert into questions (bank_id, group_id, code, source, input_type, text, declaration_level, position) values ($1, $2, 'P-001', 'PROFILE', 'TEXT', 'Câu hỏi', 'basic', 1)",
        [bankId, groupId],
      );

    await insertQuestion();

    await expectPgError(insertQuestion(), "23505");
  });

  it("câu hỏi chỉ nhận nguồn và trụ cột hợp lệ", async () => {
    const bankId = await insertBank("check-source", "draft");
    const group = await database.pool.query<{ id: string }>(
      "insert into question_groups (bank_id, code, title, position, track) values ($1, 'C-G01', 'Nhóm', 1, 'core') returning id",
      [bankId],
    );
    const insert = (source: string, pillar: string | null) =>
      database.pool.query(
        "insert into questions (bank_id, group_id, code, source, pillar, input_type, text, declaration_level, position) values ($1, $2, 'C-001', $3, $4, 'PRACTICE', 'Câu hỏi', 'basic', 1)",
        [bankId, group.rows[0]?.id, source, pillar],
      );

    await expectPgError(insert("KHAC", null), "23514");
    await expectPgError(insert("COMMON", "X"), "23514");
    await insert("COMMON", "E");
  });

  it("route mặc định là {} và evidence_rule cho phép null", async () => {
    const bankId = await insertBank("t-route", "draft");
    const group = await database.pool.query<{ id: string }>(
      "insert into question_groups (bank_id, code, title, position, track) values ($1, 'C-G01', 'Nhóm', 1, 'core') returning id",
      [bankId],
    );
    const question = await database.pool.query<{ route: unknown; evidence_rule: unknown }>(
      "insert into questions (bank_id, group_id, code, source, input_type, text, declaration_level, position) values ($1, $2, 'C-001', 'COMMON', 'PRACTICE', 'Câu hỏi', 'extended', 1) returning route, evidence_rule",
      [bankId, group.rows[0]?.id],
    );

    expect(question.rows[0]?.route).toEqual({});
    expect(question.rows[0]?.evidence_rule).toBeNull();
  });

  it("mỗi (người dùng, báo cáo) chỉ một bản nháp, kể cả khi chưa có báo cáo", async () => {
    const userId = await insertUser("draft@example.com");
    const insertDraft = () =>
      database.pool.query(
        "insert into report_drafts (user_id, report_id, data, schema_version) values ($1, null, '{}'::jsonb, 2)",
        [userId],
      );

    await insertDraft();

    await expectPgError(insertDraft(), "23505");
  });

  it("tệp: sha256, loại và kích thước được kiểm tra", async () => {
    const insertFile = (key: string, kind: string, size: number, sha: string) =>
      database.pool.query(
        "insert into files (storage_key, kind, mime, size, sha256) values ($1, $2, 'application/pdf', $3, $4)",
        [key, kind, size, sha],
      );
    const validSha = "a".repeat(64);

    await insertFile("k/ok", "evidence", 10, validSha);

    await expectPgError(insertFile("k/bad-sha", "evidence", 10, "xyz"), "23514");
    await expectPgError(insertFile("k/bad-kind", "other", 10, validSha), "23514");
    await expectPgError(insertFile("k/bad-size", "evidence", -1, validSha), "23514");
    await expectPgError(insertFile("k/ok", "evidence", 10, validSha), "23505");
  });

  it("yêu cầu tư vấn: trạng thái, ưu tiên mặc định và mã duy nhất", async () => {
    const insertInquiry = (code: string, status?: string) =>
      database.pool.query<{ status: string; priority: string; contact_consent: string }>(
        `insert into inquiries (code, kind, company_name${status ? ", status" : ""}) values ($1, 'consulting', 'Công ty A'${status ? ", $2" : ""}) returning status, priority, contact_consent`,
        status ? [code, status] : [code],
      );

    const created = await insertInquiry("TV-TEST-0001");

    expect(created.rows[0]).toEqual({
      status: "new",
      priority: "normal",
      contact_consent: "unconfirmed",
    });
    await expectPgError(insertInquiry("TV-TEST-0001"), "23505");
    await expectPgError(insertInquiry("TV-TEST-0002", "Mới tiếp nhận"), "23514");
  });

  it("bản dịch: khóa (source_hash, locale), băm 16 ký tự hex", async () => {
    const insertTranslation = (hash: string, locale: string) =>
      database.pool.query(
        "insert into translations (source_hash, locale, source_text) values ($1, $2, 'Xin chào')",
        [hash, locale],
      );

    await insertTranslation("cfe3922e372d34cb", "en");

    await expectPgError(insertTranslation("cfe3922e372d34cb", "en"), "23505");
    await expectPgError(insertTranslation("cfe3922e372d34cb", "vi"), "23514");
    await expectPgError(insertTranslation("khong-hop-le", "fr"), "23514");
  });

  it("lượt thích chống trùng theo (bài, người xem)", async () => {
    const post = await database.pool.query<{ id: string }>(
      "insert into posts (slug, locale, title, body) values ('bai-thu', 'vi', 'Bài thử', '{}'::jsonb) returning id",
    );
    const postId = post.rows[0]?.id;
    const like = () =>
      database.pool.query("insert into post_likes (post_id, voter_key_hash) values ($1, 'voter-1')", [
        postId,
      ]);

    await like();

    await expectPgError(like(), "23505");
  });

  it("bài viết trùng (slug, locale) bị từ chối nhưng khác locale thì được", async () => {
    const insertPost = (locale: string) =>
      database.pool.query(
        "insert into posts (slug, locale, title, body) values ('trung-slug', $1, 'Tiêu đề', '{}'::jsonb)",
        [locale],
      );

    await insertPost("vi");
    await insertPost("en");

    await expectPgError(insertPost("vi"), "23505");
  });
});
