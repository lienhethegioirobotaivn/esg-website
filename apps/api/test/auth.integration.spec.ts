import request from "supertest";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { MailSendError } from "../src/mail/mail-provider.js";
import { runMigrations } from "../src/database/migrate.js";
import { createTestApp, resetState, type TestApp } from "./helpers/create-test-app.js";
import { createTemporaryDatabase, type TemporaryDatabase } from "./helpers/test-database.js";

let database: TemporaryDatabase;
let current: TestApp | undefined;

beforeAll(async () => {
  database = await createTemporaryDatabase();
  await runMigrations(database.pool);
});

beforeEach(async () => {
  await resetState(database.pool);
});

afterEach(async () => {
  await current?.close();
  current = undefined;
});

afterAll(async () => {
  await database.drop();
});

async function start(overrides: Record<string, string> = {}): Promise<TestApp> {
  current = await createTestApp(database.url, overrides);
  return current;
}

function server(test: TestApp) {
  return request(test.app.getHttpServer());
}

async function requestCode(test: TestApp, email = "nguoi.dung@example.com") {
  return server(test).post("/api/v1/auth/email/request").send({ email, locale: "vi" });
}

async function backdateChallenges(seconds: number): Promise<void> {
  await database.pool.query(
    "update otp_challenges set created_at = created_at - make_interval(secs => $1)",
    [seconds],
  );
}

function sessionCookie(response: request.Response): string {
  const header = response.headers["set-cookie"];
  const cookies = Array.isArray(header) ? header : [];
  const found = cookies.find((value) => value.startsWith("esg-user="));
  if (found === undefined) {
    throw new Error("Không có cookie esg-user");
  }
  return found;
}

describe("luồng đăng nhập bằng OTP", () => {
  it("gửi mã, xác minh, đọc phiên rồi đăng xuất", async () => {
    const test = await start();

    const requested = await requestCode(test);
    expect(requested.status).toBe(200);
    expect(requested.body).toEqual({ resendAfter: 60, expiresIn: 600 });
    expect(test.mail.messages).toHaveLength(1);
    expect(test.mail.messages[0]?.to).toBe("nguoi.dung@example.com");

    const verified = await server(test)
      .post("/api/v1/auth/email/verify")
      .send({ email: "nguoi.dung@example.com", code: test.mail.lastCode() });
    expect(verified.status).toBe(200);
    expect(verified.body).toEqual({ email: "nguoi.dung@example.com" });

    const cookie = sessionCookie(verified);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Lax/i);
    expect(cookie).toMatch(/Path=\//);
    const token = cookie.split(";")[0]?.split("=")[1] ?? "";

    const me = await server(test).get("/api/v1/auth/me").set("Cookie", `esg-user=${token}`);
    expect(me.status).toBe(200);
    expect(me.body).toEqual({ email: "nguoi.dung@example.com" });
    expect(me.headers["cache-control"]).toContain("no-store");

    const stored = await database.pool.query("select token_hash from user_sessions");
    expect(stored.rowCount).toBe(1);
    expect(stored.rows[0].token_hash).not.toContain(token);
    const user = await database.pool.query("select email_verified_at, last_login_at from users");
    expect(user.rows[0].email_verified_at).not.toBeNull();
    expect(user.rows[0].last_login_at).not.toBeNull();

    const loggedOut = await server(test)
      .post("/api/v1/auth/logout")
      .set("Cookie", `esg-user=${token}`);
    expect(loggedOut.status).toBe(204);
    expect(
      (await server(test).get("/api/v1/auth/me").set("Cookie", `esg-user=${token}`)).body,
    ).toEqual({ email: null });
    expect((await database.pool.query("select 1 from user_sessions")).rowCount).toBe(0);
  });

  it("/auth/me trả email null khi chưa đăng nhập", async () => {
    const test = await start();

    const response = await server(test).get("/api/v1/auth/me");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ email: null });
  });

  it("logout khi chưa đăng nhập trả 401 theo định dạng lỗi chuẩn", async () => {
    const test = await start();

    const response = await server(test).post("/api/v1/auth/logout");

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("unauthorized");
  });

  it("chuẩn hóa email về chữ thường, bỏ khoảng trắng", async () => {
    const test = await start();

    await requestCode(test, "  Nguoi.Dung@Example.COM ");
    const verified = await server(test)
      .post("/api/v1/auth/email/verify")
      .send({ email: "NGUOI.DUNG@example.com", code: test.mail.lastCode() });

    expect(verified.status).toBe(200);
    expect(verified.body.email).toBe("nguoi.dung@example.com");
  });

  it("mã chỉ lưu băm; thư đã gửi không còn mã trong payload", async () => {
    const test = await start();

    await requestCode(test);
    const code = test.mail.lastCode();

    const challenge = await database.pool.query("select code_hash from otp_challenges");
    expect(challenge.rows[0].code_hash).not.toContain(code);
    expect(challenge.rows[0].code_hash).toMatch(/^[0-9a-f]{64}$/);
    const outbox = await database.pool.query("select status, payload from email_outbox");
    expect(outbox.rows[0].status).toBe("sent");
    expect(outbox.rows[0].payload).toEqual({});
  });
});

describe("kiểm tra dữ liệu đầu vào và lỗi chung", () => {
  it("email sai trả 400 invalid_email", async () => {
    const test = await start();

    const response = await requestCode(test, "khong-phai-email");

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: { code: "invalid_email", message: "Email chưa hợp lệ. Vui lòng kiểm tra lại." },
    });
    expect(test.mail.messages).toHaveLength(0);
  });

  it("JSON hỏng trả 400 theo định dạng lỗi chuẩn", async () => {
    const test = await start();

    const response = await server(test)
      .post("/api/v1/auth/email/request")
      .set("Content-Type", "application/json")
      .send("{khong hop le");

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("invalid_request");
  });

  it("route không tồn tại trả 404 theo định dạng lỗi chuẩn", async () => {
    const test = await start();

    const response = await server(test).get("/api/v1/khong-co");

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("not_found");
  });

  it("mã sai định dạng trả 400 invalid_request", async () => {
    const test = await start();

    const response = await server(test)
      .post("/api/v1/auth/email/verify")
      .send({ email: "a@example.com", code: "12ab" });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("invalid_request");
  });
});

describe("quy tắc OTP", () => {
  it("sai tối đa 5 lần: triesLeft giảm dần rồi khóa, kể cả khi sau đó nhập đúng", async () => {
    const test = await start();
    await requestCode(test);
    const correct = test.mail.lastCode();
    const wrong = correct === "000000" ? "111111" : "000000";

    const tries: number[] = [];
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const response = await server(test)
        .post("/api/v1/auth/email/verify")
        .send({ email: "nguoi.dung@example.com", code: wrong });
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("otp_invalid");
      tries.push(response.body.error.triesLeft);
    }
    expect(tries).toEqual([4, 3, 2, 1, 0]);

    const locked = await server(test)
      .post("/api/v1/auth/email/verify")
      .send({ email: "nguoi.dung@example.com", code: correct });
    expect(locked.status).toBe(429);
    expect(locked.body.error.code).toBe("otp_locked");
    expect((await database.pool.query("select 1 from user_sessions")).rowCount).toBe(0);
  });

  it("mã hết hạn trả 410", async () => {
    const test = await start();
    await requestCode(test);
    await database.pool.query("update otp_challenges set expires_at = now() - interval '1 second'");

    const response = await server(test)
      .post("/api/v1/auth/email/verify")
      .send({ email: "nguoi.dung@example.com", code: test.mail.lastCode() });

    expect(response.status).toBe(410);
    expect(response.body.error.code).toBe("otp_expired");
  });

  it("chưa từng yêu cầu mã thì xác minh trả 410", async () => {
    const test = await start();

    const response = await server(test)
      .post("/api/v1/auth/email/verify")
      .send({ email: "chua.co@example.com", code: "123456" });

    expect(response.status).toBe(410);
  });

  it("mã dùng rồi không dùng lại được", async () => {
    const test = await start();
    await requestCode(test);
    const code = test.mail.lastCode();
    const body = { email: "nguoi.dung@example.com", code };

    expect((await server(test).post("/api/v1/auth/email/verify").send(body)).status).toBe(200);
    const again = await server(test).post("/api/v1/auth/email/verify").send(body);

    expect(again.status).toBe(410);
  });

  it("gửi lại trong 60 giây bị từ chối, kèm Retry-After", async () => {
    const test = await start();
    await requestCode(test);

    const second = await requestCode(test);

    expect(second.status).toBe(429);
    expect(second.body.error.code).toBe("otp_wait");
    expect(second.body.error.retryAfter).toBeGreaterThan(0);
    expect(second.body.error.retryAfter).toBeLessThanOrEqual(60);
    expect(Number(second.headers["retry-after"])).toBe(second.body.error.retryAfter);
    expect(test.mail.messages).toHaveLength(1);
  });

  it("gửi lại sau 60 giây được; mã cũ mất hiệu lực", async () => {
    const test = await start();
    await requestCode(test);
    const oldCode = test.mail.lastCode();
    await backdateChallenges(61);

    const second = await requestCode(test);
    expect(second.status).toBe(200);
    const newCode = test.mail.lastCode();

    const active = await database.pool.query(
      "select count(*)::int as total from otp_challenges where consumed_at is null",
    );
    expect(active.rows[0].total).toBe(1);

    if (oldCode !== newCode) {
      const stale = await server(test)
        .post("/api/v1/auth/email/verify")
        .send({ email: "nguoi.dung@example.com", code: oldCode });
      expect(stale.status).toBe(400);
    }
    const fresh = await server(test)
      .post("/api/v1/auth/email/verify")
      .send({ email: "nguoi.dung@example.com", code: newCode });
    expect(fresh.status).toBe(200);
  });

  it("tối đa 3 lần mỗi giờ cho một email", async () => {
    const test = await start();
    for (let index = 0; index < 3; index += 1) {
      expect((await requestCode(test)).status).toBe(200);
      await backdateChallenges(61);
    }

    const fourth = await requestCode(test);

    expect(fourth.status).toBe(429);
    expect(fourth.body.error.code).toBe("otp_hourly_limit");
    expect(fourth.body.error.retryAfter).toBeGreaterThan(60);
    expect(fourth.body.error.retryAfter).toBeLessThanOrEqual(3600);
    expect(test.mail.messages).toHaveLength(3);
  });

  it("sau 1 giờ email được yêu cầu lại", async () => {
    const test = await start();
    for (let index = 0; index < 3; index += 1) {
      await requestCode(test);
      await backdateChallenges(61);
    }
    await backdateChallenges(3600);

    expect((await requestCode(test)).status).toBe(200);
  });

  it("hai yêu cầu đồng thời cho cùng một email chỉ gửi một thư", async () => {
    const test = await start();

    const responses = await Promise.all([requestCode(test), requestCode(test)]);

    expect(responses.map((response) => response.status).sort()).toEqual([200, 429]);
    expect(test.mail.messages).toHaveLength(1);
  });
});

describe("giới hạn theo IP và hạn mức thư", () => {
  it("một IP chỉ yêu cầu 6 mã trong 10 phút", async () => {
    const test = await start();
    for (let index = 0; index < 6; index += 1) {
      const response = await requestCode(test, `nguoi${index}@example.com`);
      expect(response.status).toBe(200);
    }

    const seventh = await requestCode(test, "nguoi7@example.com");

    expect(seventh.status).toBe(429);
    expect(seventh.body.error.code).toBe("rate_limited");
    expect(seventh.body.error.retryAfter).toBeGreaterThan(0);
    expect(test.mail.messages).toHaveLength(6);
  });

  it("một IP chỉ xác minh 20 lần trong 10 phút", async () => {
    const test = await start();
    const statuses: number[] = [];
    for (let index = 0; index < 21; index += 1) {
      const response = await server(test)
        .post("/api/v1/auth/email/verify")
        .send({ email: "a@example.com", code: "123456" });
      statuses.push(response.status);
    }

    expect(statuses.slice(0, 20).every((status) => status === 410)).toBe(true);
    expect(statuses[20]).toBe(429);
  });

  it("hết hạn mức thư trong 24 giờ thì ngừng gửi mã mới", async () => {
    const test = await start({ MAIL_DAILY_LIMIT: "1" });
    expect((await requestCode(test, "mot@example.com")).status).toBe(200);

    const second = await requestCode(test, "hai@example.com");

    expect(second.status).toBe(503);
    expect(second.body.error.code).toBe("mail_daily_limit");
    expect(test.mail.messages).toHaveLength(1);
  });
});

describe("khi nhà cung cấp email lỗi", () => {
  it("trả 502, xóa mã vừa tạo và không bắt người dùng chờ 60 giây", async () => {
    const test = await start();
    test.mail.failure = new MailSendError("Brevo trả HTTP 503", true);

    const failed = await requestCode(test);

    expect(failed.status).toBe(502);
    expect(failed.body.error.code).toBe("mail_unavailable");
    expect((await database.pool.query("select 1 from otp_challenges")).rowCount).toBe(0);
    const outbox = await database.pool.query("select status, payload, error from email_outbox");
    expect(outbox.rows[0].status).toBe("failed");
    expect(outbox.rows[0].payload).toEqual({});
    expect(outbox.rows[0].error).toContain("503");

    test.mail.failure = null;
    expect((await requestCode(test)).status).toBe(200);
  });
});

describe("phiên đăng nhập", () => {
  it("phiên hết hạn không còn hợp lệ", async () => {
    const test = await start();
    await requestCode(test);
    const verified = await server(test)
      .post("/api/v1/auth/email/verify")
      .send({ email: "nguoi.dung@example.com", code: test.mail.lastCode() });
    const token = sessionCookie(verified).split(";")[0]?.split("=")[1] ?? "";
    await database.pool.query("update user_sessions set expires_at = now() - interval '1 second'");

    const me = await server(test).get("/api/v1/auth/me").set("Cookie", `esg-user=${token}`);

    expect(me.body).toEqual({ email: null });
  });

  it("đăng nhập lần hai dùng lại người dùng cũ và giữ ngày xác thực đầu tiên", async () => {
    const test = await start();
    await requestCode(test);
    await server(test)
      .post("/api/v1/auth/email/verify")
      .send({ email: "nguoi.dung@example.com", code: test.mail.lastCode() });
    const first = await database.pool.query("select id, email_verified_at from users");
    await backdateChallenges(61);

    await requestCode(test);
    await server(test)
      .post("/api/v1/auth/email/verify")
      .send({ email: "nguoi.dung@example.com", code: test.mail.lastCode() });

    const users = await database.pool.query("select id, email_verified_at from users");
    expect(users.rowCount).toBe(1);
    expect(users.rows[0].id).toBe(first.rows[0].id);
    expect(users.rows[0].email_verified_at).toEqual(first.rows[0].email_verified_at);
    expect((await database.pool.query("select 1 from user_sessions")).rowCount).toBe(2);
  });
});
