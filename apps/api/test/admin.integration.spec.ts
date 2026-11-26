import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import ExcelJS from "exceljs";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { AdminBootstrapService } from "../src/admin/admin-bootstrap.service.js";
import { hashPassword } from "../src/admin/password.js";
import { createDatabase } from "../src/database/client.js";
import { runMigrations } from "../src/database/migrate.js";
import { FeedbackInviteService } from "../src/feedback/feedback-invite.service.js";
import { importQuestionBank } from "../src/question-bank/import-question-bank.js";
import { QUESTION_BANK_XLSX } from "../src/question-bank/question-bank-fixture.js";
import { createTestApp, resetState, type TestApp } from "./helpers/create-test-app.js";
import { createTemporaryDatabase, type TemporaryDatabase } from "./helpers/test-database.js";

let database: TemporaryDatabase;
let testApp: TestApp;
let storageDir: string;

const PASSWORD = "mat-khau-thu-nghiem-123";
const ADMIN_ENV = {
  ADMIN_BOOTSTRAP_EMAIL: "root@example.com",
  ADMIN_BOOTSTRAP_PASSWORD: PASSWORD,
  ADMIN_NOTIFY_EMAIL: "ops@example.com",
  PUBLIC_BASE_URL: "https://esg.example.com",
};

const COMPANY_FIELDS: Record<string, string> = {
  name: "Công ty ABC",
  industry: "manufacturing",
  headcount: "50-199",
  address: "1 Lê Lợi, Hà Nội",
  reportPeriod: "full_year",
  reportYear: "2025",
  reportScope: "",
  taxCode: "0100000000",
  contactName: "Nguyễn Văn A",
  email: "abc@example.com",
  phone: "0900000000",
  advisoryNeed: "",
  assessmentNeed: "",
  consentB2B: "yes",
  consentData: "",
};

function api() {
  return request(testApp.app.getHttpServer());
}

function db() {
  return createDatabase(database.pool);
}

async function rows<T extends Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
  return (await database.pool.query<T>(sql, params)).rows;
}

async function count(table: string): Promise<number> {
  return Number((await rows<{ n: string }>(`select count(*) as n from ${table}`))[0]?.n ?? 0);
}

async function createAdmin(email: string, role: "admin" | "content" | "ops", password = PASSWORD) {
  const [row] = await rows<{ id: string }>(
    "insert into admin_users (email, name, role, password_hash) values ($1, $2, $3, $4) returning id",
    [email, `Tên ${role}`, role, await hashPassword(password)],
  );
  return row?.id ?? "";
}

async function loginAs(email: string, password = PASSWORD): Promise<string> {
  const response = await api().post("/api/v1/admin/login").send({ email, password }).expect(200);
  const cookies = response.headers["set-cookie"] as unknown as string[];
  return cookies.map((cookie) => cookie.split(";")[0]).join("; ");
}

async function sessionFor(role: "admin" | "content" | "ops"): Promise<string> {
  const email = `${role}@example.com`;
  await createAdmin(email, role);
  return loginAs(email);
}

function stripBom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

function binary(
  res: { on(event: string, listener: (chunk: Buffer) => void): unknown },   done: (error: Error | null, body: Buffer) => void,
): void {
  const chunks: Buffer[] = [];
  res.on("data", (chunk: Buffer) => chunks.push(chunk));
  res.on("end", () => done(null, Buffer.concat(chunks)));
}

async function audit(action: string): Promise<Record<string, unknown>[]> {
  return rows("select * from audit_logs where action = $1 order by created_at", [action]);
}

function saveCompany(cookie?: string) {
  const call = api().post("/api/v1/companies");
  if (cookie !== undefined) {
    call.set("Cookie", cookie);
  }
  for (const [key, value] of Object.entries(COMPANY_FIELDS)) {
    call.field(key, value);
  }
  return call;
}

async function userLogin(email: string): Promise<string> {
  await api().post("/api/v1/auth/email/request").send({ email, locale: "vi" }).expect(200);
  const verified = await api()
    .post("/api/v1/auth/email/verify")
    .send({ email, code: testApp.mail.lastCode() })
    .expect(200);
  const cookies = verified.headers["set-cookie"] as unknown as string[];
  return cookies.map((cookie) => cookie.split(";")[0]).join("; ");
}

beforeAll(async () => {
  storageDir = await mkdtemp(join(tmpdir(), "esg-storage-"));
  database = await createTemporaryDatabase();
  await runMigrations(database.pool);
  testApp = await createTestApp(database.url, { STORAGE_DIR: storageDir, ...ADMIN_ENV });
});

afterAll(async () => {
  await testApp.close();
  await database.drop();
  await rm(storageDir, { recursive: true, force: true });
  for (const key of Object.keys(ADMIN_ENV)) {
    delete process.env[key];
  }
});

beforeEach(async () => {
  await resetState(database.pool);
  await importQuestionBank(db(), { source: QUESTION_BANK_XLSX, publish: true });
});

describe("tài khoản quản trị đầu tiên", () => {
  it("tạo từ biến môi trường một lần duy nhất rồi đăng nhập được", async () => {
    const bootstrap = testApp.app.get(AdminBootstrapService);
    expect(await bootstrap.ensureFirstAdmin()).toBe(true);
    expect(await bootstrap.ensureFirstAdmin()).toBe(false);
    expect(await count("admin_users")).toBe(1);

    const cookie = await loginAs("root@example.com");
    const me = await api().get("/api/v1/admin/me").set("Cookie", cookie).expect(200);
    expect(me.body).toEqual({ email: "root@example.com", name: "Quản trị viên", role: "admin" });
    expect(await audit("admin_user.bootstrap")).toHaveLength(1);
    expect(await audit("admin.login")).toHaveLength(1);
  });

  it("không lưu mật khẩu dạng rõ", async () => {
    await testApp.app.get(AdminBootstrapService).ensureFirstAdmin();
    const [row] = await rows<{ password_hash: string }>("select password_hash from admin_users");
    expect(row?.password_hash.startsWith("scrypt$")).toBe(true);
    expect(row?.password_hash).not.toContain(PASSWORD);
  });
});

describe("đăng nhập quản trị", () => {
  it("trả cùng một lỗi cho sai mật khẩu và email không tồn tại", async () => {
    await createAdmin("ops@example.com", "ops");
    const wrongPassword = await api()
      .post("/api/v1/admin/login")
      .send({ email: "ops@example.com", password: "sai-mat-khau-hoan-toan" })
      .expect(401);
    const unknown = await api()
      .post("/api/v1/admin/login")
      .send({ email: "khong-co@example.com", password: "sai-mat-khau-hoan-toan" })
      .expect(401);
    expect(wrongPassword.body).toEqual(unknown.body);
    expect(wrongPassword.body.error.code).toBe("invalid_credentials");
  });

  it("khóa tài khoản sau 5 lần sai, kể cả khi sau đó nhập đúng", async () => {
    await createAdmin("ops@example.com", "ops");
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await api()
        .post("/api/v1/admin/login")
        .send({ email: "ops@example.com", password: "sai-mat-khau-hoan-toan" })
        .expect(401);
    }
    const locked = await api()
      .post("/api/v1/admin/login")
      .send({ email: "ops@example.com", password: PASSWORD })
      .expect(429);
    expect(locked.body.error.code).toBe("admin_locked");
    expect(await audit("admin.locked")).toHaveLength(1);

    await database.pool.query("update admin_users set locked_until = now() - interval '1 minute'");
    await loginAs("ops@example.com");
  });

  it("đăng nhập đúng xóa bộ đếm sai và đặt cookie httpOnly", async () => {
    await createAdmin("ops@example.com", "ops");
    await api()
      .post("/api/v1/admin/login")
      .send({ email: "ops@example.com", password: "sai-mat-khau-hoan-toan" })
      .expect(401);
    const response = await api()
      .post("/api/v1/admin/login")
      .send({ email: "ops@example.com", password: PASSWORD })
      .expect(200);
    const cookie = (response.headers["set-cookie"] as unknown as string[])[0] ?? "";
    expect(cookie).toContain("esg-admin=");
    expect(cookie).toContain("HttpOnly");
    const [row] = await rows<{ failed_attempts: number }>("select failed_attempts from admin_users");
    expect(row?.failed_attempts).toBe(0);
  });

  it("đăng xuất xóa phiên và ghi nhật ký", async () => {
    const cookie = await sessionFor("ops");
    await api().post("/api/v1/admin/logout").set("Cookie", cookie).expect(204);
    await api().get("/api/v1/admin/me").set("Cookie", cookie).expect(401);
    expect(await audit("admin.logout")).toHaveLength(1);
  });

  it("từ chối tài khoản bị vô hiệu hóa", async () => {
    await createAdmin("ops@example.com", "ops");
    await database.pool.query("update admin_users set active = false");
    await api()
      .post("/api/v1/admin/login")
      .send({ email: "ops@example.com", password: PASSWORD })
      .expect(401);
  });
});

describe("phân quyền theo vai trò", () => {
  const protectedPaths = [
    "/api/v1/admin/inquiries",
    "/api/v1/admin/customers",
    "/api/v1/admin/feedback",
    "/api/v1/admin/users",
  ];

  it("từ chối khi chưa đăng nhập", async () => {
    for (const path of protectedPaths) {
      const response = await api().get(path).expect(401);
      expect(response.body.error.code).toBe("unauthorized");
    }
  });

  it("không nhận cookie của người dùng thường làm phiên quản trị", async () => {
    const cookie = await userLogin("khach@example.com");
    await api().get("/api/v1/admin/inquiries").set("Cookie", cookie).expect(401);
  });

  it("vai trò content không vào được CRM hay quản lý tài khoản", async () => {
    const cookie = await sessionFor("content");
    for (const path of protectedPaths) {
      const response = await api().get(path).set("Cookie", cookie).expect(403);
      expect(response.body.error.code).toBe("forbidden");
    }
    await api().get("/api/v1/admin/me").set("Cookie", cookie).expect(200);
  });

  it("vai trò ops vào được CRM nhưng không quản lý tài khoản", async () => {
    const cookie = await sessionFor("ops");
    for (const path of protectedPaths.slice(0, 3)) {
      await api().get(path).set("Cookie", cookie).expect(200);
    }
    await api().get("/api/v1/admin/users").set("Cookie", cookie).expect(403);
  });

  it("vai trò admin vào được mọi nơi", async () => {
    const cookie = await sessionFor("admin");
    for (const path of protectedPaths) {
      await api().get(path).set("Cookie", cookie).expect(200);
    }
  });
});

describe("quản lý tài khoản quản trị", () => {
  it("tạo tài khoản mới, từ chối email trùng và mật khẩu ngắn, ghi nhật ký", async () => {
    const cookie = await sessionFor("admin");
    const created = await api()
      .post("/api/v1/admin/users")
      .set("Cookie", cookie)
      .send({ email: "Moi@Example.com", name: "Nhân viên mới", role: "ops", password: PASSWORD })
      .expect(201);
    expect(created.body).toMatchObject({ email: "moi@example.com", role: "ops", active: true });
    expect(created.body.passwordHash).toBeUndefined();

    const duplicate = await api()
      .post("/api/v1/admin/users")
      .set("Cookie", cookie)
      .send({ email: "moi@example.com", name: "Trùng", role: "ops", password: PASSWORD })
      .expect(409);
    expect(duplicate.body.error.code).toBe("email_taken");
    await api()
      .post("/api/v1/admin/users")
      .set("Cookie", cookie)
      .send({ email: "ngan@example.com", name: "Ngắn", role: "ops", password: "ngan" })
      .expect(400);

    await loginAs("moi@example.com");
    const entries = await audit("admin_user.create");
    expect(entries).toHaveLength(1);
    expect(JSON.stringify(entries[0])).not.toContain(PASSWORD);
  });

  it("vô hiệu hóa một tài khoản thì phiên đang mở của họ bị đóng", async () => {
    const adminCookie = await sessionFor("admin");
    const opsId = await createAdmin("nv@example.com", "ops");
    const opsCookie = await loginAs("nv@example.com");
    await api().get("/api/v1/admin/me").set("Cookie", opsCookie).expect(200);

    await api()
      .patch(`/api/v1/admin/users/${opsId}`)
      .set("Cookie", adminCookie)
      .send({ active: false })
      .expect(200);
    await api().get("/api/v1/admin/me").set("Cookie", opsCookie).expect(401);
    expect(await audit("admin_user.update")).toHaveLength(1);
  });

  it("đổi mật khẩu đóng các phiên cũ và đăng nhập được bằng mật khẩu mới", async () => {
    const adminCookie = await sessionFor("admin");
    const opsId = await createAdmin("nv@example.com", "ops");
    const oldCookie = await loginAs("nv@example.com");
    await api()
      .patch(`/api/v1/admin/users/${opsId}`)
      .set("Cookie", adminCookie)
      .send({ password: "mat-khau-moi-rat-dai-456" })
      .expect(200);
    await api().get("/api/v1/admin/me").set("Cookie", oldCookie).expect(401);
    await loginAs("nv@example.com", "mat-khau-moi-rat-dai-456");
  });

  it("không cho tự hạ quyền mình hoặc bỏ quản trị viên cuối cùng", async () => {
    const adminCookie = await sessionFor("admin");
    const [self] = await rows<{ id: string }>("select id from admin_users where role = 'admin'");
    const selfDemote = await api()
      .patch(`/api/v1/admin/users/${self?.id}`)
      .set("Cookie", adminCookie)
      .send({ role: "ops" })
      .expect(409);
    expect(selfDemote.body.error.code).toBe("last_admin");

    const secondId = await createAdmin("admin2@example.com", "admin");
    const secondCookie = await loginAs("admin2@example.com");
    await api()
      .patch(`/api/v1/admin/users/${self?.id}`)
      .set("Cookie", secondCookie)
      .send({ active: false })
      .expect(200);
    const lastAdmin = await api()
      .patch(`/api/v1/admin/users/${secondId}`)
      .set("Cookie", secondCookie)
      .send({ active: false })
      .expect(409);
    expect(lastAdmin.body.error.code).toBe("last_admin");
  });

  it("trả 404 cho tài khoản không tồn tại và 400 cho id sai", async () => {
    const cookie = await sessionFor("admin");
    await api()
      .patch("/api/v1/admin/users/0198f0f0-0000-7000-8000-000000000000")
      .set("Cookie", cookie)
      .send({ name: "X" })
      .expect(404);
    await api().patch("/api/v1/admin/users/khong-phai-uuid").set("Cookie", cookie).send({ name: "X" }).expect(400);
  });
});

describe("yêu cầu tư vấn / thẩm định", () => {
  const BODY = {
    kind: "consulting",
    companyName: "Công ty Tư Vấn",
    contactEmail: "lienhe@example.com",
    message: "Cần tư vấn lập báo cáo ESG",
    contactConsent: true,
  };

  it("nhận yêu cầu công khai, lưu đồng ý liên hệ và gửi thư báo cho quản trị", async () => {
    const response = await api().post("/api/v1/inquiries").send(BODY).expect(201);
    expect(response.body.code).toMatch(/^TV-\d{8}-[A-Z0-9]{5}$/);

    const [inquiry] = await rows<{ status: string; contact_consent: string; company_name: string }>(
      "select status, contact_consent, company_name from inquiries",
    );
    expect(inquiry).toEqual({ status: "new", contact_consent: "yes", company_name: "Công ty Tư Vấn" });

    const [mail] = await rows<{ to_email: string; template: string; payload: { url: string } }>(
      "select to_email, template, payload from email_outbox",
    );
    expect(mail?.to_email).toBe("ops@example.com");
    expect(mail?.template).toBe("inquiry_notice");
    expect(mail?.payload.url).toBe(`https://esg.example.com/admin/inquiries/${response.body.code}`);
    expect(await audit("inquiry.create")).toHaveLength(1);
  });

  it("từ chối khi không có email lẫn số điện thoại hoặc thiếu tên doanh nghiệp", async () => {
    const noContact = await api()
      .post("/api/v1/inquiries")
      .send({ kind: "consulting", companyName: "A" })
      .expect(400);
    expect(noContact.body.error.code).toBe("invalid_inquiry");
    await api().post("/api/v1/inquiries").send({ ...BODY, companyName: "" }).expect(400);
    await api().post("/api/v1/inquiries").send({ ...BODY, kind: "khac" }).expect(400);
    expect(await count("inquiries")).toBe(0);
  });

  it("chỉ cần số điện thoại vẫn được nhận, và liên kết hồ sơ khi có mã báo cáo", async () => {
    const { reportCode } = (await saveCompany().expect(200)).body as { reportCode: string };
    await api()
      .post("/api/v1/inquiries")
      .send({ kind: "verification", companyName: "ABC", contactPhone: "0900 000 000", reportCode })
      .expect(201);
    const [row] = await rows<{ company_id: string | null; contact_email: string | null }>(
      "select company_id, contact_email from inquiries",
    );
    expect(row?.company_id).not.toBeNull();
    expect(row?.contact_email).toBeNull();
  });

  it("giới hạn 10 yêu cầu mỗi giờ từ một địa chỉ", async () => {
    for (let index = 0; index < 10; index += 1) {
      await api().post("/api/v1/inquiries").send(BODY).expect(201);
    }
    const blocked = await api().post("/api/v1/inquiries").send(BODY).expect(429);
    expect(blocked.body.error.code).toBe("rate_limited");
  });

  it("quản trị xem danh sách, lọc, cập nhật trạng thái và ghi chú", async () => {
    await api().post("/api/v1/inquiries").send(BODY).expect(201);
    await api()
      .post("/api/v1/inquiries")
      .send({ ...BODY, kind: "verification", companyName: "Công ty Thẩm Định" })
      .expect(201);
    const cookie = await sessionFor("ops");

    const all = await api().get("/api/v1/admin/inquiries").set("Cookie", cookie).expect(200);
    expect(all.body.total).toBe(2);
    const filtered = await api()
      .get("/api/v1/admin/inquiries?kind=verification&q=th%E1%BA%A9m")
      .set("Cookie", cookie)
      .expect(200);
    expect(filtered.body.items.map((item: { companyName: string }) => item.companyName)).toEqual([
      "Công ty Thẩm Định",
    ]);
    await api().get("/api/v1/admin/inquiries?status=sai").set("Cookie", cookie).expect(400);

    const id = all.body.items[0].id as string;
    const updated = await api()
      .patch(`/api/v1/admin/inquiries/${id}`)
      .set("Cookie", cookie)
      .send({ status: "contacting", priority: "high", followUpAt: "2026-12-01T03:00:00.000Z" })
      .expect(200);
    expect(updated.body).toMatchObject({ status: "contacting", priority: "high" });
    expect(updated.body.firstContactedAt).not.toBeNull();
    expect(updated.body.followUpAt).toBe("2026-12-01T03:00:00.000Z");

    const noted = await api()
      .post(`/api/v1/admin/inquiries/${id}/notes`)
      .set("Cookie", cookie)
      .send({ body: "Đã gọi điện, hẹn gọi lại thứ Hai" })
      .expect(201);
    expect(noted.body.notes).toHaveLength(1);
    expect(noted.body.notes[0].body).toBe("Đã gọi điện, hẹn gọi lại thứ Hai");

    await api().patch(`/api/v1/admin/inquiries/${id}`).set("Cookie", cookie).send({}).expect(400);
    await api()
      .patch(`/api/v1/admin/inquiries/${id}`)
      .set("Cookie", cookie)
      .send({ assignedAdminId: "0198f0f0-0000-7000-8000-000000000000" })
      .expect(400);

    const [change] = await audit("inquiry.update");
    expect(change?.["meta"]).toMatchObject({ from: "new", to: "contacting" });
    expect(await audit("inquiry.note")).toHaveLength(1);
  });

  it("xuất CSV đúng nội dung và ghi nhật ký xuất file", async () => {
    await api().post("/api/v1/inquiries").send(BODY).expect(201);
    await api()
      .post("/api/v1/inquiries")
      .send({ ...BODY, companyName: "=HYPERLINK(\"http://x\")", kind: "verification" })
      .expect(201);
    const cookie = await sessionFor("ops");

    const response = await api().get("/api/v1/admin/inquiries/export?format=csv").set("Cookie", cookie).expect(200);
    expect(response.headers["content-type"]).toContain("text/csv");
    expect(response.headers["content-disposition"]).toMatch(/attachment; filename="yeu-cau-\d{8}\.csv"/);
    const lines = stripBom(response.text).trim().split("\r\n");
    expect(lines[0]).toBe(
      "Mã,Loại,Trạng thái,Ưu tiên,Doanh nghiệp,Email,Điện thoại,Quy mô,Ngành,Nội dung,Đồng ý liên hệ,Kết quả,Ngày tạo",
    );
    expect(lines).toHaveLength(3);
    expect(response.text).toContain("Công ty Tư Vấn,lienhe@example.com");
    expect(response.text).toContain("\"'=HYPERLINK(\"\"http://x\"\")\"");

    const filtered = await api()
      .get("/api/v1/admin/inquiries/export?format=csv&kind=consulting")
      .set("Cookie", cookie)
      .expect(200);
    expect(stripBom(filtered.text).trim().split("\r\n")).toHaveLength(2);

    const entries = await audit("inquiry.export");
    expect(entries).toHaveLength(2);
    expect(entries[0]?.["meta"]).toEqual({ format: "csv", rows: 2 });
  });

  it("xuất XLSX đọc lại được và content không được xuất", async () => {
    await api().post("/api/v1/inquiries").send(BODY).expect(201);
    const cookie = await sessionFor("ops");
    const response = await api()
      .get("/api/v1/admin/inquiries/export?format=xlsx")
      .set("Cookie", cookie)
      .buffer(true)
      .parse(binary)
      .expect(200);
    expect(response.headers["content-type"]).toContain("spreadsheetml");
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(new Uint8Array(response.body as Buffer).buffer);
    const sheet = workbook.getWorksheet("Yêu cầu");
    expect(sheet?.rowCount).toBe(2);
    expect(sheet?.getRow(2).getCell(5).value).toBe("Công ty Tư Vấn");

    const contentCookie = await sessionFor("content");
    await api().get("/api/v1/admin/inquiries/export").set("Cookie", contentCookie).expect(403);
  });
});

describe("CRM khách hàng", () => {
  it("liệt kê hồ sơ doanh nghiệp, cập nhật chăm sóc và ghi nhật ký", async () => {
    await saveCompany().expect(200);
    const cookie = await sessionFor("ops");
    const [ops] = await rows<{ id: string }>("select id from admin_users");

    const list = await api().get("/api/v1/admin/customers").set("Cookie", cookie).expect(200);
    expect(list.body.total).toBe(1);
    expect(list.body.items[0]).toMatchObject({
      legalName: "Công ty ABC",
      careStatus: "new",
      reportCount: 1,
      advisoryConsent: null,
    });

    const id = list.body.items[0].id as string;
    const updated = await api()
      .patch(`/api/v1/admin/customers/${id}`)
      .set("Cookie", cookie)
      .send({
        careStatus: "following_up",
        nextContactAt: "2026-12-05T02:00:00.000Z",
        careNote: "Quan tâm gói thẩm định",
        assignedAdminId: ops?.id,
      })
      .expect(200);
    expect(updated.body).toMatchObject({
      careStatus: "following_up",
      careNote: "Quan tâm gói thẩm định",
      assignedAdminId: ops?.id,
      nextContactAt: "2026-12-05T02:00:00.000Z",
    });
    expect(updated.body.firstContactedAt).not.toBeNull();
    expect(updated.body.reports).toHaveLength(1);
    expect(updated.body.assignee.id).toBe(ops?.id);

    const byStatus = await api().get("/api/v1/admin/customers?careStatus=new").set("Cookie", cookie).expect(200);
    expect(byStatus.body.total).toBe(0);
    const search = await api().get("/api/v1/admin/customers?q=abc").set("Cookie", cookie).expect(200);
    expect(search.body.total).toBe(1);

    const [entry] = await audit("customer.update");
    expect(entry?.["meta"]).toMatchObject({ from: "new", to: "following_up" });
    await api()
      .patch(`/api/v1/admin/customers/${id}`)
      .set("Cookie", cookie)
      .send({ careStatus: "khong-co" })
      .expect(400);
  });

  it("trả 404 cho khách hàng không tồn tại", async () => {
    const cookie = await sessionFor("ops");
    await api()
      .get("/api/v1/admin/customers/0198f0f0-0000-7000-8000-000000000000")
      .set("Cookie", cookie)
      .expect(404);
  });

  it("xuất CSV có thông tin liên hệ và trạng thái đồng ý tư vấn", async () => {
    await saveCompany().expect(200);
    const cookie = await sessionFor("ops");
    const response = await api().get("/api/v1/admin/customers/export").set("Cookie", cookie).expect(200);
    const lines = stripBom(response.text).trim().split("\r\n");
    expect(lines).toHaveLength(2);
    expect(lines[0]).toContain("Tên pháp lý,Tên thương mại,Mã số thuế");
    expect(lines[1]).toContain("Công ty ABC");
    expect(lines[1]).toContain("abc@example.com");
    expect(lines[1]).toContain("0900000000");
    expect((await audit("customer.export"))[0]?.["meta"]).toEqual({ format: "csv", rows: 1 });
  });
});

describe("phản hồi", () => {
  it("nhận phản hồi trực tiếp, kiểm tra điểm và nhận xét", async () => {
    const response = await api()
      .post("/api/v1/feedback")
      .send({ rating: 5, comment: "Rất dễ dùng", email: "Khach@Example.com" })
      .expect(201);
    expect(response.body.code).toMatch(/^FB-\d{8}-[A-Z0-9]{5}$/);
    const [row] = await rows<{ kind: string; rating: number; email: string; submitted_at: string | null }>(
      "select kind, rating, email, submitted_at from feedbacks",
    );
    expect(row).toMatchObject({ kind: "direct", rating: 5, email: "khach@example.com" });
    expect(row?.submitted_at).not.toBeNull();

    await api().post("/api/v1/feedback").send({ rating: 6 }).expect(400);
    await api().post("/api/v1/feedback").send({ rating: 0 }).expect(400);
    await api().post("/api/v1/feedback").send({ comment: "thiếu điểm" }).expect(400);
    expect(await count("feedbacks")).toBe(1);
  });

  async function dueReport(
    email: string,
    ageDays: number,
  ): Promise<{ reportCode: string; cookie: string }> {
    const cookie = await userLogin(email);
    const { reportCode } = (await saveCompany(cookie).expect(200)).body as { reportCode: string };
    await database.pool.query(
      "update reports set status = 'exported', last_export_at = now() - make_interval(days => $2) where code = $1",
      [reportCode, ageDays],
    );
    return { reportCode, cookie };
  }

  async function inviteToken(): Promise<string> {
    const [mail] = await rows<{ payload: { url: string } }>(
      "select payload from email_outbox where template = 'feedback_invite' order by created_at desc limit 1",
    );
    const token = new URL(mail?.payload.url ?? "").searchParams.get("token");
    return token ?? "";
  }

  it("mời đúng một lần cho báo cáo xuất đã quá 5 ngày và bỏ qua báo cáo chưa đủ hạn hoặc quá cũ", async () => {
    const due = await dueReport("due@example.com", 6);
    await dueReport("fresh@example.com", 3);
    await dueReport("old@example.com", 40);
    const invites = testApp.app.get(FeedbackInviteService);

    expect(await invites.sendDue()).toEqual({ invited: 1 });
    expect(await invites.sendDue()).toEqual({ invited: 0 });

    const [mail] = await rows<{ to_email: string; payload: { url: string; reportCode: string } }>(
      "select to_email, payload from email_outbox where template = 'feedback_invite'",
    );
    expect(await count("feedbacks")).toBe(1);
    expect(mail?.to_email).toBe("due@example.com");
    expect(mail?.payload.reportCode).toBe(due.reportCode);
    expect(mail?.payload.url).toMatch(/^https:\/\/esg\.example\.com\/feedback\?token=[A-Za-z0-9_-]{30,}$/);
    const [stored] = await rows<{ token_hash: string; kind: string }>(
      "select token_hash, kind from feedbacks",
    );
    expect(stored?.kind).toBe("invite");
    expect(mail?.payload.url).not.toContain(stored?.token_hash ?? "x");
  });

  it("không mời báo cáo chưa có chủ sở hữu có email", async () => {
    const { reportCode } = (await saveCompany().expect(200)).body as { reportCode: string };
    await database.pool.query(
      "update reports set status = 'exported', last_export_at = now() - interval '6 days' where code = $1",
      [reportCode],
    );
    expect(await testApp.app.get(FeedbackInviteService).sendDue()).toEqual({ invited: 0 });
  });

  it("liên kết mời chỉ dùng được một lần", async () => {
    const { reportCode } = await dueReport("due@example.com", 6);
    await testApp.app.get(FeedbackInviteService).sendDue();
    const token = await inviteToken();

    const inspect = await api().get(`/api/v1/feedback/invite/${token}`).expect(200);
    expect(inspect.body).toEqual({ reportCode });

    await api().post(`/api/v1/feedback/invite/${token}`).send({ rating: 9 }).expect(400);
    const done = await api()
      .post(`/api/v1/feedback/invite/${token}`)
      .send({ rating: 4, comment: "Tốt" })
      .expect(200);
    expect(done.body).toEqual({ code: null });

    const again = await api().post(`/api/v1/feedback/invite/${token}`).send({ rating: 1 }).expect(409);
    expect(again.body.error.code).toBe("feedback_used");
    const reopen = await api().get(`/api/v1/feedback/invite/${token}`).expect(409);
    expect(reopen.body.error.code).toBe("feedback_used");

    const [row] = await rows<{ rating: number; comment: string }>("select rating, comment from feedbacks");
    expect(row).toEqual({ rating: 4, comment: "Tốt" });
  });

  it("trả 404 cho liên kết lạ hoặc sai định dạng", async () => {
    const unknown = "A".repeat(43);
    await api().get(`/api/v1/feedback/invite/${unknown}`).expect(404);
    await api().post(`/api/v1/feedback/invite/${unknown}`).send({ rating: 3 }).expect(404);
    await api().get("/api/v1/feedback/invite/ngan").expect(404);
  });

  it("hai lượt gửi đồng thời chỉ một lượt thành công", async () => {
    await dueReport("due@example.com", 6);
    await testApp.app.get(FeedbackInviteService).sendDue();
    const token = await inviteToken();
    const results = await Promise.all([
      api().post(`/api/v1/feedback/invite/${token}`).send({ rating: 5 }),
      api().post(`/api/v1/feedback/invite/${token}`).send({ rating: 2 }),
    ]);
    expect(results.map((result) => result.status).sort()).toEqual([200, 409]);
  });

  it("quản trị xem danh sách có điểm trung bình và xuất file", async () => {
    await api().post("/api/v1/feedback").send({ rating: 5, comment: "Tốt" }).expect(201);
    await api().post("/api/v1/feedback").send({ rating: 2, comment: "Chưa ổn, cần sửa" }).expect(201);
    const cookie = await sessionFor("ops");

    const list = await api().get("/api/v1/admin/feedback").set("Cookie", cookie).expect(200);
    expect(list.body).toMatchObject({ total: 2, answered: 2, averageRating: 3.5 });
    const direct = await api().get("/api/v1/admin/feedback?kind=invite").set("Cookie", cookie).expect(200);
    expect(direct.body).toMatchObject({ total: 0, answered: 0, averageRating: null });

    const file = await api().get("/api/v1/admin/feedback/export").set("Cookie", cookie).expect(200);
    expect(file.text).toContain("\"Chưa ổn, cần sửa\"");
    expect(stripBom(file.text).trim().split("\r\n")).toHaveLength(3);
    expect(await audit("feedback.export")).toHaveLength(1);
  });
});
