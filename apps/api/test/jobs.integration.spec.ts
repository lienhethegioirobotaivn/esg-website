import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import pg from "pg";

import { CleanupService } from "../src/jobs/cleanup.service.js";
import { JobScheduler } from "../src/jobs/job-scheduler.js";
import { runMigrations } from "../src/database/migrate.js";
import { MAIL_TEMPLATES } from "../src/mail/mail-templates.js";
import { MailSendError } from "../src/mail/mail-provider.js";
import { MailService } from "../src/mail/mail.service.js";
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
  delete (MAIL_TEMPLATES as Record<string, unknown>)["probe"];
});

afterAll(async () => {
  await database.drop();
});

async function start(overrides: Record<string, string> = {}): Promise<TestApp> {
  current = await createTestApp(database.url, overrides);
  return current;
}

function registerProbeTemplate(maxAttempts: number): void {
  (MAIL_TEMPLATES as Record<string, unknown>)["probe"] = {
    maxAttempts,
    priority: "normal",
    scrubPayloadAfterSend: false,
    render: (_payload: unknown, to: string) => ({ to, subject: "probe", text: "probe" }),
  };
}

async function enqueueProbe(test: TestApp, to = "probe@example.com"): Promise<string> {
  return test.app.get(MailService).enqueue({ to, template: "probe" as never, payload: {} });
}

async function outboxRow(id: string) {
  const result = await database.pool.query(
    "select status, attempts, error, payload, next_attempt_at > now() as in_future from email_outbox where id = $1",
    [id],
  );
  return result.rows[0];
}

describe("hộp thư đi (email_outbox)", () => {
  it("gửi thành công: đánh dấu sent và xóa mã OTP khỏi payload", async () => {
    const test = await start();
    const id = await test.app
      .get(MailService)
      .enqueue({ to: "a@example.com", template: "otp", payload: { code: "123456", locale: "vi" } });

    const outcome = await test.app.get(MailService).deliver(id);

    expect(outcome).toBe("sent");
    expect(test.mail.messages[0]?.text).toContain("123456");
    expect(await outboxRow(id)).toMatchObject({ status: "sent", attempts: 1, payload: {} });
  });

  it("lỗi tạm thời: xếp lịch thử lại, chưa được chọn khi chưa đến hạn", async () => {
    registerProbeTemplate(3);
    const test = await start();
    const mail = test.app.get(MailService);
    const id = await enqueueProbe(test);
    test.mail.failure = new MailSendError("Brevo trả HTTP 503", true);

    expect(await mail.deliver(id)).toBe("retry");
    expect(await outboxRow(id)).toMatchObject({ status: "pending", attempts: 1, in_future: true });
    expect(await mail.deliverDue()).toMatchObject({ sent: 0, failed: 0, retry: 0, skipped: 0 });

    test.mail.failure = null;
    await database.pool.query("update email_outbox set next_attempt_at = now() - interval '1 second'");
    expect(await mail.deliverDue()).toMatchObject({ sent: 1 });
    expect(await outboxRow(id)).toMatchObject({ status: "sent", attempts: 2, error: null });
  });

  it("quá số lần thử thì chuyển failed", async () => {
    registerProbeTemplate(2);
    const test = await start();
    const mail = test.app.get(MailService);
    const id = await enqueueProbe(test);
    test.mail.failure = new MailSendError("Brevo trả HTTP 500", true);

    expect(await mail.deliver(id)).toBe("retry");
    await database.pool.query("update email_outbox set next_attempt_at = now() - interval '1 second'");
    expect(await mail.deliver(id)).toBe("failed");

    expect(await outboxRow(id)).toMatchObject({ status: "failed", attempts: 2 });
  });

  it("lỗi không thể thử lại (ví dụ sai khóa API) chuyển failed ngay", async () => {
    registerProbeTemplate(5);
    const test = await start();
    const id = await enqueueProbe(test);
    test.mail.failure = new MailSendError("Brevo trả HTTP 401: Key not found", false);

    expect(await test.app.get(MailService).deliver(id)).toBe("failed");

    expect(await outboxRow(id)).toMatchObject({ status: "failed", attempts: 1 });
  });

  it("hai tiến trình cùng lấy một thư thì chỉ gửi một lần", async () => {
    registerProbeTemplate(3);
    const test = await start();
    test.mail.delayMs = 50;
    const id = await enqueueProbe(test);
    const mail = test.app.get(MailService);

    const outcomes = await Promise.all([mail.deliver(id), mail.deliver(id)]);

    expect(outcomes.slice().sort()).toEqual(["sent", "skipped"]);
    expect(test.mail.messages).toHaveLength(1);
  });

  it("gần hết hạn mức ngày thì chỉ gửi OTP, thư thường chờ", async () => {
    registerProbeTemplate(3);
    const test = await start({ MAIL_DAILY_LIMIT: "10" });
    for (let index = 0; index < 8; index += 1) {
      await database.pool.query(
        "insert into email_outbox (to_email, template, status, sent_at) values ('x@example.com', 'probe', 'sent', now())",
      );
    }
    const mail = test.app.get(MailService);
    const probeId = await enqueueProbe(test);
    const otpId = await mail.enqueue({
      to: "otp@example.com",
      template: "otp",
      payload: { code: "654321", locale: "vi" },
    });

    const summary = await mail.deliverDue();

    expect(summary).toMatchObject({ sent: 1, skipped: 1 });
    expect((await outboxRow(otpId)).status).toBe("sent");
    expect((await outboxRow(probeId)).status).toBe("pending");
  });

  it("mẫu thư không tồn tại chuyển failed thay vì kẹt mãi", async () => {
    const test = await start();
    const result = await database.pool.query(
      "insert into email_outbox (to_email, template) values ('a@example.com', 'khong-co') returning id",
    );

    expect(await test.app.get(MailService).deliver(result.rows[0].id)).toBe("failed");
  });
});

describe("việc nền dọn dữ liệu", () => {
  async function seed(): Promise<void> {
    const pool = database.pool;
    await pool.query(`
      insert into otp_challenges (email, code_hash, expires_at, consumed_at, created_at) values
        ('old-expired@example.com', 'h', now() - interval '2 days', null, now() - interval '3 days'),
        ('old-used@example.com', 'h', now() + interval '1 day', now() - interval '2 days', now() - interval '3 days'),
        ('recent-expired@example.com', 'h', now() - interval '1 hour', null, now() - interval '2 hours'),
        ('fresh@example.com', 'h', now() + interval '5 minutes', null, now())
    `);
    await pool.query("insert into users (email) values ('u@example.com')");
    await pool.query(`
      insert into user_sessions (user_id, token_hash, expires_at)
      select id, 'expired-token', now() - interval '1 minute' from users
      union all select id, 'valid-token', now() + interval '1 day' from users
    `);
    await pool.query(`
      insert into rate_limits (key, window_start, hits) values
        ('old', now() - interval '3 days', 1),
        ('new', now(), 1)
    `);
    await pool.query(`
      insert into email_outbox (to_email, template, status, sent_at) values
        ('old-sent@example.com', 'otp', 'sent', now() - interval '31 days'),
        ('new-sent@example.com', 'otp', 'sent', now() - interval '1 day')
    `);
    await pool.query(`
      insert into email_outbox (to_email, template, status) values ('failed@example.com', 'otp', 'failed')
    `);
  }

  async function count(table: string): Promise<number> {
    const result = await database.pool.query(`select count(*)::int as total from ${table}`);
    return result.rows[0].total;
  }

  it("dọn OTP: xóa mã hết hạn/đã dùng quá 1 ngày, giữ mã còn mới", async () => {
    const test = await start();
    await seed();

    const deleted = await test.app.get(CleanupService).otpChallenges();

    expect(deleted).toBe(2);
    const left = await database.pool.query("select email from otp_challenges order by email");
    expect(left.rows.map((row) => row.email)).toEqual([
      "fresh@example.com",
      "recent-expired@example.com",
    ]);
  });

  it("dọn phiên hết hạn, giữ phiên còn hiệu lực", async () => {
    const test = await start();
    await seed();

    expect(await test.app.get(CleanupService).sessions()).toBe(1);

    const left = await database.pool.query("select token_hash from user_sessions");
    expect(left.rows).toEqual([{ token_hash: "valid-token" }]);
  });

  it("dọn rate_limits cũ hơn 2 ngày", async () => {
    const test = await start();
    await seed();

    expect(await test.app.get(CleanupService).rateLimits()).toBe(1);
    expect(await count("rate_limits")).toBe(1);
  });

  it("dọn thư đã gửi quá 30 ngày, giữ thư mới và thư lỗi", async () => {
    const test = await start();
    await seed();

    expect(await test.app.get(CleanupService).sentEmails()).toBe(1);
    expect(await count("email_outbox")).toBe(2);
  });

  it("runOnce ghi job_runs thành công kèm số dòng đã xóa", async () => {
    const test = await start();
    await seed();

    const outcome = await test.app.get(JobScheduler).runOnce("cleanup-sessions");

    expect(outcome).toBe("ran");
    const runs = await database.pool.query("select job, status, finished_at, detail from job_runs");
    expect(runs.rows).toHaveLength(1);
    expect(runs.rows[0]).toMatchObject({
      job: "cleanup-sessions",
      status: "succeeded",
      detail: { deleted: 1 },
    });
    expect(runs.rows[0].finished_at).not.toBeNull();
  });

  it("việc deliver-outbox không ghi job_runs", async () => {
    const test = await start();

    expect(await test.app.get(JobScheduler).runOnce("deliver-outbox")).toBe("ran");

    expect(await count("job_runs")).toBe(0);
  });

  it("bỏ qua khi một tiến trình khác đang giữ khóa của việc đó", async () => {
    const test = await start();
    const other = new pg.Client({ connectionString: database.url });
    await other.connect();
    try {
      await other.query("select pg_advisory_lock(hashtext('job:cleanup-sessions'))");

      expect(await test.app.get(JobScheduler).runOnce("cleanup-sessions")).toBe("skipped");
      expect(await count("job_runs")).toBe(0);
    } finally {
      await other.end();
    }
    expect(await test.app.get(JobScheduler).runOnce("cleanup-sessions")).toBe("ran");
  });

  it("từ chối tên việc không tồn tại", async () => {
    const test = await start();

    await expect(test.app.get(JobScheduler).runOnce("khong-co")).rejects.toThrow(/khong-co/);
  });

  it("bản ghi job_runs là failed khi việc ném lỗi", async () => {
    const test = await start();
    const scheduler = test.app.get(JobScheduler);
    (scheduler as unknown as { jobs: unknown[] }).jobs = [
      {
        name: "hong",
        intervalMs: 1000,
        initialDelayMs: 0,
        track: true,
        run: () => Promise.reject(new Error("hỏng giả lập")),
      },
    ];

    expect(await scheduler.runOnce("hong")).toBe("failed");

    const runs = await database.pool.query("select status, detail from job_runs");
    expect(runs.rows[0]).toMatchObject({ status: "failed", detail: { error: "hỏng giả lập" } });
  });
});
