import { mkdir, mkdtemp, rm, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { runMigrations } from "../src/database/migrate.js";
import { adminSession } from "./helpers/admin-session.js";
import { createTestApp, resetState, type TestApp } from "./helpers/create-test-app.js";
import { createTemporaryDatabase, type TemporaryDatabase } from "./helpers/test-database.js";

const OLD_PASSWORD = "mat-khau-thu-nghiem-123";
const NEW_PASSWORD = "mat-khau-hoan-toan-moi-456";

let database: TemporaryDatabase;
let testApp: TestApp;
let storageDir: string;
let cookie: string;

function http() {
  return request(testApp.app.getHttpServer());
}

function get(path: string) {
  return http().get(`/api/v1/admin${path}`).set("Cookie", cookie);
}

async function insertEmail(status: string, payload: object = { code: "TV-1" }): Promise<string> {
  const result = await database.pool.query<{ id: string }>(
    "insert into email_outbox (to_email, template, payload, status, attempts, error) values ('a@example.com', 'inquiry_notice', $1, $2, 5, 'Lỗi thử') returning id",
    [JSON.stringify(payload), status],
  );
  const [row] = result.rows;
  if (row === undefined) {
    throw new Error("Không chèn được thư thử");
  }
  return row.id;
}

beforeAll(async () => {
  database = await createTemporaryDatabase();
  await runMigrations(database.pool);
  storageDir = await mkdtemp(join(tmpdir(), "esg-system-"));
  testApp = await createTestApp(database.url, {
    STORAGE_DIR: storageDir,
    ADMIN_NOTIFY_EMAIL: "env@example.com",
  });
});

afterAll(async () => {
  await testApp.close();
  await database.drop();
  await rm(storageDir, { recursive: true, force: true });
});

beforeEach(async () => {
  await resetState(database.pool);
  cookie = await adminSession(testApp.app, database.pool, "admin");
});

describe("quyền truy cập hệ thống", () => {
  it("chỉ quản trị viên xem được việc nền, thư, tệp và cài đặt", async () => {
    for (const role of ["content", "ops"] as const) {
      cookie = await adminSession(testApp.app, database.pool, role);
      for (const path of ["/jobs", "/outbox", "/files/health", "/settings"]) {
        await get(path).expect(403);
      }
    }
  });

  it("vận hành lấy được danh sách người phụ trách, nội dung thì không", async () => {
    await adminSession(testApp.app, database.pool, "content");
    cookie = await adminSession(testApp.app, database.pool, "ops");
    const response = await get("/assignees").expect(200);
    expect(response.body.assignees.map((item: { role: string }) => item.role).sort()).toEqual([
      "admin",
      "ops",
    ]);
    cookie = await adminSession(testApp.app, database.pool, "content");
    await get("/assignees").expect(403);
  });
});

describe("đổi mật khẩu", () => {
  const change = (body: object) =>
    http().post("/api/v1/admin/me/password").set("Cookie", cookie).send(body);

  it("đổi được mật khẩu, giữ phiên hiện tại và thoát các phiên khác", async () => {
    const other = await adminSession(testApp.app, database.pool, "admin");
    await change({ currentPassword: OLD_PASSWORD, newPassword: NEW_PASSWORD }).expect(204);

    await get("/me").expect(200);
    await http().get("/api/v1/admin/me").set("Cookie", other).expect(401);
    const login = (password: string) =>
      http().post("/api/v1/admin/login").send({ email: "admin@example.com", password });
    await login(OLD_PASSWORD).expect(401);
    await login(NEW_PASSWORD).expect(200);
  });

  it("từ chối mật khẩu cũ sai, mật khẩu ngắn và mật khẩu trùng", async () => {
    const wrong = await change({ currentPassword: "sai-sai-sai-sai", newPassword: NEW_PASSWORD }).expect(400);
    expect(wrong.body.error.code).toBe("wrong_password");
    await change({ currentPassword: OLD_PASSWORD, newPassword: "ngan" }).expect(400);
    await change({ currentPassword: OLD_PASSWORD, newPassword: OLD_PASSWORD }).expect(400);
  });
});

describe("việc nền", () => {
  it("liệt kê 12 việc và chạy ngay được", async () => {
    const list = await get("/jobs").expect(200);
    expect(list.body.jobs).toHaveLength(12);

    const run = await http()
      .post("/api/v1/admin/jobs/cleanup-sessions/run")
      .set("Cookie", cookie)
      .expect(200);
    expect(run.body.outcome).toBe("ran");
    expect(run.body.job.lastRun.status).toBe("succeeded");
    await http().post("/api/v1/admin/jobs/khong-co/run").set("Cookie", cookie).expect(404);
  });
});

describe("thư gửi lỗi", () => {
  it("liệt kê không kèm nội dung, gửi lại và xóa được", async () => {
    const failed = await insertEmail("failed");
    const removable = await insertEmail("failed", {});
    await insertEmail("sent");

    const list = await get("/outbox").expect(200);
    expect(list.body.counts).toEqual({ pending: 0, sent: 1, failed: 2 });
    expect(JSON.stringify(list.body)).not.toContain("payload");

    const post = (id: string) =>
      http().post(`/api/v1/admin/outbox/${id}/retry`).set("Cookie", cookie);
    await post(removable).expect(409);
    await post(failed).expect(204);
    await post(failed).expect(409);
    await http().delete(`/api/v1/admin/outbox/${removable}`).set("Cookie", cookie).expect(204);

    const after = await get("/outbox?status=pending").expect(200);
    expect(after.body.items).toHaveLength(1);
    expect(after.body.items[0]).toMatchObject({ id: failed, attempts: 0, error: null });
  });
});

describe("kiểm tra tệp", () => {
  it("báo tệp mất, tệp thừa và chỉ dọn tệp thừa đã cũ", async () => {
    await database.pool.query(
      "insert into files (storage_key, kind, mime, size, sha256, original_name) values ('2026/11/00000000-0000-4000-8000-000000000001', 'post_image', 'image/webp', 10, repeat('a', 64), 'mat.webp')",
    );
    const folder = join(storageDir, "2026", "11");
    await mkdir(folder, { recursive: true });
    const old = join(folder, "00000000-0000-4000-8000-000000000002");
    await writeFile(old, "cu");
    const past = new Date(Date.now() - 48 * 60 * 60 * 1000);
    await utimes(old, past, past);
    await writeFile(join(folder, "00000000-0000-4000-8000-000000000003"), "moi");

    const health = await get("/files/health").expect(200);
    expect(health.body.missingTotal).toBe(1);
    expect(health.body.missing[0].originalName).toBe("mat.webp");
    expect(health.body.untracked).toMatchObject({ count: 2, removable: 1 });

    const cleaned = await http()
      .delete("/api/v1/admin/files/untracked")
      .set("Cookie", cookie)
      .expect(200);
    expect(cleaned.body).toEqual({ removed: 1 });
    expect((await get("/files/health").expect(200)).body.untracked.count).toBe(1);
  });
});

describe("cài đặt", () => {
  const save = (body: object) =>
    http().patch("/api/v1/admin/settings").set("Cookie", cookie).send(body);
  const inquire = () =>
    http()
      .post("/api/v1/inquiries")
      .send({ kind: "consulting", companyName: "Công ty A", contactEmail: "a@example.com", contactConsent: true })
      .expect(201);
  const recipients = async () =>
    (
      await database.pool.query<{ to_email: string }>(
        "select to_email from email_outbox order by created_at, id",
      )
    ).rows.map((row) => row.to_email);

  it("email nhận thông báo lấy từ cài đặt, để trống thì dùng .env", async () => {
    expect((await get("/settings").expect(200)).body).toMatchObject({
      feedbackInviteDelayDays: 5,
      inquiryNotifyEmail: null,
      defaults: { inquiryNotifyEmail: "env@example.com" },
    });
    await inquire();
    await save({ inquiryNotifyEmail: "Moi@Example.com" }).expect(200);
    await inquire();
    await save({ inquiryNotifyEmail: null }).expect(200);
    await inquire();

    expect(await recipients()).toEqual(["env@example.com", "moi@example.com", "env@example.com"]);
  });

  it("lưu số ngày mời đánh giá và giới hạn 1 đến 29", async () => {
    await save({ feedbackInviteDelayDays: 0 }).expect(400);
    await save({ feedbackInviteDelayDays: 30 }).expect(400);
    await save({ inquiryNotifyEmail: "khong-phai-email" }).expect(400);
    expect((await save({ feedbackInviteDelayDays: 2 }).expect(200)).body.feedbackInviteDelayDays).toBe(2);
    expect((await save({ feedbackInviteDelayDays: null }).expect(200)).body.feedbackInviteDelayDays).toBe(5);
  });
});
