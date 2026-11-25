import { existsSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createDatabase } from "../src/database/client.js";
import { runMigrations } from "../src/database/migrate.js";
import { CleanupService } from "../src/jobs/cleanup.service.js";
import { importQuestionBank } from "../src/question-bank/import-question-bank.js";
import { QUESTION_BANK_XLSX } from "../src/question-bank/question-bank-fixture.js";
import { createTestApp, resetState, type TestApp } from "./helpers/create-test-app.js";
import { createTemporaryDatabase, type TemporaryDatabase } from "./helpers/test-database.js";

let database: TemporaryDatabase;
let testApp: TestApp;
let storageDir: string;

const PDF = Buffer.from("%PDF-1.4\n1 0 obj<<>>endobj\n%%EOF\n");
const DOCX = Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.from("word/document.xml")]);
const PNG = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.from("png-body"),
]);

const SNAPSHOT = JSON.stringify({
  version: 1,
  savedAt: "2026-01-01T00:00:00.000Z",
  locale: "vi",
  company: { name: "Công ty ABC" },
  answers: {},
  activeGroupId: null,
  plan: { tasks: [], goal: "", resources: "", reviewCycle: "" },
  theme: null,
});

const DRAFT = {
  version: 2,
  savedAt: "2026-01-01T00:00:00.000Z",
  company: {},
  answers: {},
  activeGroupId: null,
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
  contactName: "",
  email: "abc@example.com",
  phone: "",
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

async function login(email: string): Promise<string> {
  await api().post("/api/v1/auth/email/request").send({ email, locale: "vi" }).expect(200);
  const verified = await api()
    .post("/api/v1/auth/email/verify")
    .send({ email, code: testApp.mail.lastCode() })
    .expect(200);
  const cookies = verified.headers["set-cookie"] as unknown as string[];
  return cookies.map((cookie) => cookie.split(";")[0]).join("; ");
}

function saveCompany(cookie?: string, extra: Record<string, string> = {}) {
  const call = api().post("/api/v1/companies");
  if (cookie !== undefined) {
    call.set("Cookie", cookie);
  }
  for (const [key, value] of Object.entries({ ...COMPANY_FIELDS, ...extra })) {
    call.field(key, value);
  }
  return call;
}

async function newReport(cookie?: string): Promise<{ reportCode: string; claimToken: string | null }> {
  const response = await saveCompany(cookie).expect(200);
  return response.body as { reportCode: string; claimToken: string | null };
}

interface ExportOptions {
  cookie?: string;
  pdf?: Buffer | null;
  docx?: Buffer | null;
  status?: string;
}

function postExport(reportCode: string, options: ExportOptions = {}) {
  const call = api()
    .post("/api/v1/reports/exports")
    .field("reportCode", reportCode)
    .field("locale", "vi")
    .field("status", options.status ?? "complete")
    .field("theme", "default")
    .field("snapshot", SNAPSHOT);
  if (options.cookie !== undefined) {
    call.set("Cookie", options.cookie);
  }
  const pdf = options.pdf === undefined ? PDF : options.pdf;
  const docx = options.docx === undefined ? DOCX : options.docx;
  if (pdf !== null) {
    call.attach("pdf", pdf, { filename: "bao-cao.pdf", contentType: "application/pdf" });
  }
  if (docx !== null) {
    call.attach("docx", docx, { filename: "bao-cao.docx" });
  }
  return call;
}

async function exportOnce(reportCode: string, options: ExportOptions = {}) {
  const response = await postExport(reportCode, options).expect(200);
  return response.body as { exportId: string; reportCode: string; attachToken: string | null };
}

function cleanup(): CleanupService {
  return testApp.app.get(CleanupService);
}

beforeAll(async () => {
  storageDir = await mkdtemp(join(tmpdir(), "esg-storage-"));
  database = await createTemporaryDatabase();
  await runMigrations(database.pool);
  testApp = await createTestApp(database.url, { STORAGE_DIR: storageDir });
});

afterAll(async () => {
  await testApp.close();
  await database.drop();
  await rm(storageDir, { recursive: true, force: true });
});

beforeEach(async () => {
  await resetState(database.pool);
  await importQuestionBank(db(), { source: QUESTION_BANK_XLSX, publish: true });
});

describe("POST /companies", () => {
  it("tạo hồ sơ và báo cáo, trả mã báo cáo cùng mã nhận báo cáo", async () => {
    const { reportCode, claimToken } = await newReport();

    expect(reportCode).toMatch(/^ESG-\d{8}-[A-Z0-9]{4}$/);
    expect(claimToken).not.toBeNull();
    const [company] = await rows<{ legal_name: string; primary_sector: string; headcount_tier: string }>(
      "select legal_name, primary_sector, headcount_tier from companies",
    );
    expect(company).toEqual({ legal_name: "Công ty ABC", primary_sector: "MAN", headcount_tier: "50-199" });
    expect(await count("reports")).toBe(1);
  });

  it("cập nhật cùng hồ sơ khi gửi lại đúng mã báo cáo, ghi lịch sử đồng ý khi đổi ý", async () => {
    const { reportCode } = await newReport();
    await saveCompany(undefined, { reportCode, name: "Công ty ABC mới", consentB2B: "" }).expect(200);
    await saveCompany(undefined, { reportCode, consentB2B: "" }).expect(200);

    expect(await count("companies")).toBe(1);
    expect(await count("reports")).toBe(1);
    const [company] = await rows<{ legal_name: string }>("select legal_name from companies");
    expect(company?.legal_name).toBe("Công ty ABC");
    const consents = await rows<{ kind: string; granted: boolean }>(
      "select kind, granted from consents order by created_at, id",
    );
    expect(consents.filter((row) => row.kind === "matching").map((row) => row.granted)).toEqual([true, false]);
    expect(consents.filter((row) => row.kind === "research")).toEqual([]);
  });

  it("lưu logo hợp lệ và từ chối logo sai định dạng", async () => {
    const good = await api()
      .post("/api/v1/companies")
      .field(COMPANY_FIELDS)
      .attach("logo", PNG, { filename: "logo.png" })
      .expect(200);
    expect(good.body.reportCode).toBeDefined();
    const [file] = await rows<{ kind: string; mime: string; referenced_at: string | null }>(
      "select kind, mime, referenced_at from files",
    );
    expect(file).toMatchObject({ kind: "logo", mime: "image/png" });
    expect(file?.referenced_at).not.toBeNull();

    const bad = await api()
      .post("/api/v1/companies")
      .field(COMPANY_FIELDS)
      .attach("logo", Buffer.from("<html></html>"), { filename: "logo.png", contentType: "image/png" })
      .expect(400);
    expect(bad.body.error.code).toBe("invalid_file");
  });

  it("từ chối logo quá 2 MB bằng mã 413 (file_too_large sát ngưỡng, payload_too_large khi vượt xa)", async () => {
    const justOver = Buffer.concat([PNG, Buffer.alloc(2 * 1024 * 1024 + 1 - PNG.length)]);
    const near = await api()
      .post("/api/v1/companies")
      .field(COMPANY_FIELDS)
      .attach("logo", justOver, { filename: "logo.png" })
      .expect(413);
    expect(near.body.error.code).toBe("file_too_large");

    const far = await api()
      .post("/api/v1/companies")
      .field(COMPANY_FIELDS)
      .attach("logo", Buffer.concat([PNG, Buffer.alloc(5 * 1024 * 1024)]), { filename: "logo.png" })
      .expect(413);
    expect(far.body.error.code).toBe("payload_too_large");
    expect(await count("companies")).toBe(0);
  });

  it("từ chối dữ liệu thiếu hoặc sai", async () => {
    const response = await saveCompany(undefined, { name: "" }).expect(400);
    expect(response.body.error.code).toBe("invalid_company");
  });

  it("báo 503 khi chưa có bộ câu hỏi đã phát hành", async () => {
    await database.pool.query("truncate question_banks cascade");
    const response = await saveCompany().expect(503);
    expect(response.body.error.code).toBe("survey_bank_unavailable");
  });

  it("không cho người khác cập nhật hồ sơ của báo cáo đã có chủ", async () => {
    const owner = await login("chu@example.com");
    const { reportCode } = await newReport(owner);
    await saveCompany(undefined, { reportCode }).expect(403);
    const other = await login("khac@example.com");
    await saveCompany(other, { reportCode }).expect(403);
    await saveCompany(owner, { reportCode, name: "Tên mới" }).expect(200);
  });
});

describe("POST /reports/exports", () => {
  it("lưu bản xuất ẩn danh, trả mã bản xuất và attachToken", async () => {
    const { reportCode } = await newReport();
    const result = await exportOnce(reportCode);

    expect(result.exportId).toMatch(/^RX-\d{8}-[A-Z0-9]{6}$/);
    expect(result.attachToken).toEqual(expect.any(String));
    const [exported] = await rows<{ status: string; brand: string }>(
      "select status, brand from report_exports",
    );
    expect(exported).toEqual({ status: "complete", brand: "default" });
    const [report] = await rows<{ status: string; owner_user_id: string | null }>(
      "select status, owner_user_id from reports",
    );
    expect(report).toEqual({ status: "exported", owner_user_id: null });
    const referenced = await rows<{ referenced_at: string | null }>("select referenced_at from files");
    expect(referenced).toHaveLength(2);
    expect(referenced.every((row) => row.referenced_at !== null)).toBe(true);
  });

  it("gắn chủ ngay khi gọi lúc đã đăng nhập và không phát attachToken", async () => {
    const cookie = await login("chu@example.com");
    const { reportCode } = await newReport(cookie);
    const result = await exportOnce(reportCode, { cookie });

    expect(result.attachToken).toBeNull();
    const [report] = await rows<{ owner_user_id: string | null }>("select owner_user_id from reports");
    expect(report?.owner_user_id).not.toBeNull();
  });

  it("từ chối thiếu tệp, tệp sai chữ ký, mã báo cáo lạ và nội dung báo cáo hỏng", async () => {
    const { reportCode } = await newReport();

    const none = await postExport(reportCode, { pdf: null, docx: null }).expect(400);
    expect(none.body.error.code).toBe("invalid_request");

    const fakePdf = await postExport(reportCode, { pdf: Buffer.from("không phải pdf"), docx: null }).expect(400);
    expect(fakePdf.body.error.code).toBe("invalid_file");

    const unknown = await postExport("ESG-20200101-ZZZZ").expect(404);
    expect(unknown.body.error.code).toBe("report_not_found");

    const broken = await api()
      .post("/api/v1/reports/exports")
      .field("reportCode", reportCode)
      .field("locale", "vi")
      .field("status", "complete")
      .field("theme", "default")
      .field("snapshot", "{không phải json")
      .attach("pdf", PDF, { filename: "a.pdf" })
      .expect(400);
    expect(broken.body.error.code).toBe("invalid_snapshot");
    expect(await count("report_exports")).toBe(0);
  });

  it("chỉ giữ 5 bản xuất mới nhất cho mỗi báo cáo và đánh dấu xóa tệp của bản cũ", async () => {
    const { reportCode } = await newReport();
    const ids: string[] = [];
    for (let index = 0; index < 7; index += 1) {
      ids.push((await exportOnce(reportCode)).exportId);
    }

    const kept = await rows<{ export_code: string }>(
      "select export_code from report_exports order by created_at desc, id desc",
    );
    expect(kept).toHaveLength(5);
    expect(new Set(kept.map((row) => row.export_code))).toEqual(new Set(ids.slice(2)));
    const deleted = await rows<{ n: string }>("select count(*) as n from files where deleted_at is not null");
    expect(Number(deleted[0]?.n)).toBe(4);
    const live = await rows<{ n: string }>("select count(*) as n from files where deleted_at is null");
    expect(Number(live[0]?.n)).toBe(10);
  });

  it("không cho người chưa đăng nhập xuất thêm vào báo cáo đã có chủ", async () => {
    const cookie = await login("chu@example.com");
    const { reportCode } = await newReport(cookie);
    await postExport(reportCode).expect(403);
    const other = await login("khac@example.com");
    await postExport(reportCode, { cookie: other }).expect(403);
  });
});

describe("gắn bản xuất vào email", () => {
  it("gắn lần đầu, lặp lại trả already, người khác nhận 409 owner_conflict", async () => {
    const { reportCode } = await newReport();
    const { exportId, attachToken } = await exportOnce(reportCode);
    const owner = await login("chu@example.com");

    const first = await api()
      .post(`/api/v1/reports/exports/${exportId}/attach`)
      .set("Cookie", owner)
      .send({ attachToken })
      .expect(200);
    expect(first.body).toEqual({ status: "attached" });

    const again = await api()
      .post(`/api/v1/reports/exports/${exportId}/attach`)
      .set("Cookie", owner)
      .send({ attachToken })
      .expect(200);
    expect(again.body).toEqual({ status: "already" });

    const other = await login("khac@example.com");
    const conflict = await api()
      .post(`/api/v1/reports/exports/${exportId}/attach`)
      .set("Cookie", other)
      .send({ attachToken })
      .expect(409);
    expect(conflict.body.error.code).toBe("owner_conflict");
    const [company] = await rows<{ user_id: string | null }>("select user_id from companies");
    expect(company?.user_id).not.toBeNull();
  });

  it("từ chối khi thiếu đăng nhập, sai token hoặc token của bản xuất khác", async () => {
    const { reportCode } = await newReport();
    const first = await exportOnce(reportCode);
    const second = await exportOnce(reportCode);
    const owner = await login("chu@example.com");
    const url = (id: string) => `/api/v1/reports/exports/${id}/attach`;

    await api().post(url(first.exportId)).send({ attachToken: first.attachToken }).expect(401);
    const wrong = await api()
      .post(url(first.exportId))
      .set("Cookie", owner)
      .send({ attachToken: second.attachToken })
      .expect(403);
    expect(wrong.body.error.code).toBe("invalid_attach_token");
    await api()
      .post(url(first.exportId))
      .set("Cookie", owner)
      .send({ attachToken: "0.deadbeef" })
      .expect(403);
  });

  it("nhận báo cáo bằng claimToken, người khác nhận 409", async () => {
    const { reportCode, claimToken } = await newReport();
    const owner = await login("chu@example.com");

    await api()
      .post("/api/v1/reports/claim")
      .set("Cookie", owner)
      .send({ reportCode, claimToken })
      .expect(200, { status: "attached" });
    const other = await login("khac@example.com");
    const conflict = await api()
      .post("/api/v1/reports/claim")
      .set("Cookie", other)
      .send({ reportCode, claimToken })
      .expect(409);
    expect(conflict.body.error.code).toBe("owner_conflict");
    await api()
      .post("/api/v1/reports/claim")
      .set("Cookie", other)
      .send({ reportCode, claimToken: "1.abcdefghij" })
      .expect(403);
  });
});

describe("/my-reports", () => {
  async function ownedExport() {
    const owner = await login("chu@example.com");
    const { reportCode } = await newReport(owner);
    const { exportId } = await exportOnce(reportCode, { cookie: owner, status: "draft" });
    return { owner, reportCode, exportId };
  }

  it("liệt kê bản xuất của chủ đúng định dạng của @esg/shared", async () => {
    const { owner, reportCode, exportId } = await ownedExport();
    const { myReportListSchema } = await import("@esg/shared/node");

    const response = await api().get("/api/v1/my-reports").set("Cookie", owner).expect(200);
    const parsed = myReportListSchema.parse(response.body);
    expect(parsed.reports).toHaveLength(1);
    expect(parsed.reports[0]).toMatchObject({
      exportId,
      reportCode,
      status: "draft",
      company: "Công ty ABC",
      locale: "vi",
      theme: "default",
      pdf: true,
      docx: true,
    });

    const stranger = await login("khac@example.com");
    const empty = await api().get("/api/v1/my-reports").set("Cookie", stranger).expect(200);
    expect(empty.body).toEqual({ reports: [] });
    await api().get("/api/v1/my-reports").expect(401);
  });

  it("chỉ chủ báo cáo mới tải được tệp và nội dung", async () => {
    const { owner, exportId, reportCode } = await ownedExport();
    const stranger = await login("khac@example.com");
    const base = `/api/v1/my-reports/${exportId}`;

    const pdf = await api()
      .get(`${base}/files/pdf`)
      .set("Cookie", owner)
      .buffer(true)
      .parse((res, done) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () => done(null, Buffer.concat(chunks)));
      })
      .expect(200);
    expect(pdf.headers["content-type"]).toContain("application/pdf");
    expect(pdf.headers["content-disposition"]).toContain("attachment");
    expect(pdf.headers["cache-control"]).toBe("private, no-store");
    expect(Buffer.compare(pdf.body as Buffer, PDF)).toBe(0);

    const snapshot = await api().get(`${base}/snapshot`).set("Cookie", owner).expect(200);
    expect(snapshot.body.reportCode).toBe(reportCode);
    expect(snapshot.body.snapshot.version).toBe(1);

    for (const path of [`${base}/files/pdf`, `${base}/files/docx`, `${base}/snapshot`]) {
      const denied = await api().get(path).set("Cookie", stranger).expect(404);
      expect(denied.body.error.code).toBe("report_not_found");
      await api().get(path).expect(401);
    }
    await api().delete(base).set("Cookie", stranger).expect(404);
    await api().get(`${base}/files/exe`).set("Cookie", owner).expect(400);
    await api().get("/api/v1/my-reports/khong-hop-le/snapshot").set("Cookie", owner).expect(400);
  });

  it("xóa một bản xuất thì đánh dấu xóa tệp, xóa bản cuối thì xóa luôn báo cáo và hồ sơ", async () => {
    const owner = await login("chu@example.com");
    const { reportCode } = await newReport(owner);
    const first = await exportOnce(reportCode, { cookie: owner });
    const second = await exportOnce(reportCode, { cookie: owner });

    await api().delete(`/api/v1/my-reports/${first.exportId}`).set("Cookie", owner).expect(204);
    expect(await count("report_exports")).toBe(1);
    expect(await count("reports")).toBe(1);
    const gone = await rows<{ n: string }>("select count(*) as n from files where deleted_at is not null");
    expect(Number(gone[0]?.n)).toBe(2);

    await api().delete(`/api/v1/my-reports/${second.exportId}`).set("Cookie", owner).expect(204);
    expect(await count("reports")).toBe(0);
    expect(await count("companies")).toBe(0);
    const all = await rows<{ n: string }>("select count(*) as n from files where deleted_at is not null");
    expect(Number(all[0]?.n)).toBe(4);
  });
});

describe("/drafts", () => {
  const url = "/api/v1/drafts";

  it("yêu cầu đăng nhập", async () => {
    await api().get(url).expect(401);
    await api().put(url).send({}).expect(401);
  });

  it("lưu, đọc, ghi đè theo mốc thời gian và xóa bản nháp chưa gắn báo cáo", async () => {
    const cookie = await login("chu@example.com");
    const empty = await api().get(url).set("Cookie", cookie).expect(200);
    expect(empty.body).toEqual({ draft: null });

    const saved = await api()
      .put(url)
      .set("Cookie", cookie)
      .send({ reportCode: null, schemaVersion: 2, data: DRAFT })
      .expect(200);
    const read = await api().get(url).set("Cookie", cookie).expect(200);
    expect(read.body.draft).toMatchObject({ data: DRAFT, schemaVersion: 2, updatedAt: saved.body.updatedAt });

    const next = { ...DRAFT, savedAt: "2026-02-02T00:00:00.000Z" };
    const updated = await api()
      .put(url)
      .set("Cookie", cookie)
      .send({ reportCode: null, schemaVersion: 2, data: next, baseUpdatedAt: saved.body.updatedAt })
      .expect(200);
    expect(updated.body.updatedAt).not.toBe(saved.body.updatedAt);

    await api().delete(url).set("Cookie", cookie).expect(204);
    expect((await api().get(url).set("Cookie", cookie)).body).toEqual({ draft: null });
  });

  it("báo 409 draft_conflict khi mốc thời gian không khớp và cho ghi đè khi người dùng chọn", async () => {
    const cookie = await login("chu@example.com");
    const saved = await api()
      .put(url)
      .set("Cookie", cookie)
      .send({ reportCode: null, schemaVersion: 2, data: DRAFT })
      .expect(200);

    const noBase = await api()
      .put(url)
      .set("Cookie", cookie)
      .send({ reportCode: null, schemaVersion: 2, data: DRAFT })
      .expect(409);
    expect(noBase.body.error).toMatchObject({ code: "draft_conflict", updatedAt: saved.body.updatedAt });

    await api()
      .put(url)
      .set("Cookie", cookie)
      .send({ reportCode: null, schemaVersion: 2, data: DRAFT, baseUpdatedAt: "2020-01-01T00:00:00.000Z" })
      .expect(409);

    await api()
      .put(url)
      .set("Cookie", cookie)
      .send({ reportCode: null, schemaVersion: 2, data: DRAFT, overwrite: true })
      .expect(200);
  });

  it("tách bản nháp theo báo cáo, chỉ chủ báo cáo mới dùng được và từ chối dữ liệu sai", async () => {
    const owner = await login("chu@example.com");
    const { reportCode } = await newReport(owner);
    await api()
      .put(url)
      .set("Cookie", owner)
      .send({ reportCode, schemaVersion: 2, data: DRAFT })
      .expect(200);
    const generic = await api().get(url).set("Cookie", owner).expect(200);
    expect(generic.body.draft).toBeNull();
    const scoped = await api().get(`${url}?reportCode=${reportCode}`).set("Cookie", owner).expect(200);
    expect(scoped.body.draft.data).toEqual(DRAFT);

    const stranger = await login("khac@example.com");
    await api().get(`${url}?reportCode=${reportCode}`).set("Cookie", stranger).expect(404);
    await api()
      .put(url)
      .set("Cookie", stranger)
      .send({ reportCode, schemaVersion: 2, data: DRAFT })
      .expect(404);

    const bad = await api()
      .put(url)
      .set("Cookie", owner)
      .send({ reportCode: null, schemaVersion: 2, data: { version: 2 } })
      .expect(400);
    expect(bad.body.error.code).toBe("invalid_draft");
    await api()
      .put(url)
      .set("Cookie", owner)
      .send({ reportCode: null, schemaVersion: 1, data: DRAFT })
      .expect(400);
  });
});

describe("/evidence", () => {
  async function firstQuestionCode(): Promise<string> {
    const [row] = await rows<{ code: string }>("select code from questions order by code limit 1");
    return row?.code ?? "";
  }

  function upload(cookie: string, reportCode: string, questionCode: string, file = PDF, name = "mc.pdf") {
    return api()
      .post("/api/v1/evidence")
      .set("Cookie", cookie)
      .field("reportCode", reportCode)
      .field("questionCode", questionCode)
      .attach("file", file, { filename: name });
  }

  it("tải lên, liệt kê, tải về và xóa minh chứng của chủ báo cáo", async () => {
    const owner = await login("chu@example.com");
    const { reportCode } = await newReport(owner);
    const code = await firstQuestionCode();

    const created = await upload(owner, reportCode, code).expect(200);
    expect(created.body).toMatchObject({ questionCode: code, mime: "application/pdf", name: "mc.pdf" });

    const list = await api().get(`/api/v1/evidence?reportCode=${reportCode}`).set("Cookie", owner).expect(200);
    expect(list.body.evidence).toHaveLength(1);

    const file = await api()
      .get(`/api/v1/evidence/${created.body.id}/file`)
      .set("Cookie", owner)
      .buffer(true)
      .parse((res, done) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () => done(null, Buffer.concat(chunks)));
      })
      .expect(200);
    expect(Buffer.compare(file.body as Buffer, PDF)).toBe(0);

    await api().delete(`/api/v1/evidence/${created.body.id}`).set("Cookie", owner).expect(204);
    expect(await count("evidence_files")).toBe(0);
    const [deleted] = await rows<{ deleted_at: string | null }>("select deleted_at from files");
    expect(deleted?.deleted_at).not.toBeNull();
  });

  it("chỉ cho phép khi đã đăng nhập và là chủ báo cáo", async () => {
    const { reportCode } = await newReport();
    const code = await firstQuestionCode();
    const anonymous = await api()
      .post("/api/v1/evidence")
      .field("reportCode", reportCode)
      .field("questionCode", code)
      .attach("file", PDF, { filename: "mc.pdf" })
      .expect(401);
    expect(anonymous.body.error.code).toBe("unauthorized");

    const user = await login("khac@example.com");
    const unowned = await upload(user, reportCode, code).expect(404);
    expect(unowned.body.error.code).toBe("report_not_found");

    const owner = await login("chu@example.com");
    const mine = await newReport(owner);
    const created = await upload(owner, mine.reportCode, code).expect(200);
    await api().get(`/api/v1/evidence/${created.body.id}/file`).set("Cookie", user).expect(404);
    await api().delete(`/api/v1/evidence/${created.body.id}`).set("Cookie", user).expect(404);
  });

  it("từ chối loại tệp sai, câu hỏi không tồn tại và quá 10 tệp mỗi câu", async () => {
    const owner = await login("chu@example.com");
    const { reportCode } = await newReport(owner);
    const code = await firstQuestionCode();

    const wrongType = await upload(owner, reportCode, code, DOCX, "mc.docx").expect(400);
    expect(wrongType.body.error.code).toBe("invalid_file");
    const wrongQuestion = await upload(owner, reportCode, "ZZZ-999").expect(400);
    expect(wrongQuestion.body.error.code).toBe("invalid_question");

    for (let index = 0; index < 10; index += 1) {
      await upload(owner, reportCode, code, PDF, `mc-${index}.pdf`).expect(200);
    }
    const over = await upload(owner, reportCode, code).expect(409);
    expect(over.body.error.code).toBe("evidence_limit");
    const live = await rows<{ n: string }>("select count(*) as n from files where deleted_at is null");
    expect(Number(live[0]?.n)).toBe(10);
  });
});

describe("job dọn dẹp", () => {
  async function age(sql: string, params: unknown[] = []): Promise<void> {
    await database.pool.query(sql, params);
  }

  it("xóa bản xuất chưa gắn email sau 24 giờ, giữ bản đã có chủ và bản còn mới", async () => {
    const stale = await newReport();
    await exportOnce(stale.reportCode);
    const fresh = await newReport();
    await exportOnce(fresh.reportCode);
    const owner = await login("chu@example.com");
    const mine = await newReport(owner);
    await exportOnce(mine.reportCode, { cookie: owner });

    await age(
      "update report_exports set created_at = now() - interval '25 hours' where report_id in (select id from reports where code = $1 or owner_user_id is not null)",
      [stale.reportCode],
    );

    expect(await cleanup().unattachedExports()).toBe(1);
    const left = await rows<{ code: string }>("select code from reports order by code");
    expect(left.map((row) => row.code).sort()).toEqual([fresh.reportCode, mine.reportCode].sort());
    expect(await count("report_exports")).toBe(2);
  });

  it("xóa báo cáo ẩn danh bỏ dở quá 7 ngày nhưng giữ báo cáo có chủ", async () => {
    const abandoned = await newReport();
    const owner = await login("chu@example.com");
    const mine = await newReport(owner);
    await age("update reports set created_at = now() - interval '8 days'");

    expect(await cleanup().abandonedReports()).toBe(1);
    const left = await rows<{ code: string }>("select code from reports");
    expect(left.map((row) => row.code)).toEqual([mine.reportCode]);
    expect(abandoned.reportCode).not.toBe(mine.reportCode);
    expect(await count("companies")).toBe(1);
  });

  it("đánh dấu xóa tệp mồ côi quá 24 giờ rồi xóa hẳn khỏi đĩa sau 7 ngày", async () => {
    const owner = await login("chu@example.com");
    const { reportCode } = await newReport(owner);
    await upload(owner, reportCode);
    await upload(owner, reportCode);
    const referenced = await rows<{ id: string }>("select id from files");
    expect(referenced).toHaveLength(2);

    const orphan = await rows<{ id: string; storage_key: string }>(
      "insert into files (storage_key, kind, mime, size, sha256) values ('2026/01/00000000-0000-4000-8000-000000000000', 'evidence', 'application/pdf', 1, $1) returning id, storage_key",
      ["a".repeat(64)],
    );
    expect(orphan).toHaveLength(1);

    async function upload(cookie: string, code: string) {
      const [question] = await rows<{ code: string }>("select code from questions limit 1");
      await api()
        .post("/api/v1/evidence")
        .set("Cookie", cookie)
        .field("reportCode", code)
        .field("questionCode", question?.code ?? "")
        .attach("file", PDF, { filename: `${Math.random()}.pdf` })
        .expect(200);
    }

    expect(await cleanup().orphanFiles()).toBe(0);
    await age("update files set created_at = now() - interval '25 hours' where referenced_at is null");
    expect(await cleanup().orphanFiles()).toBe(1);
    const stillThere = await rows<{ storage_key: string }>("select storage_key from files where deleted_at is null");
    expect(stillThere).toHaveLength(2);

    expect(await cleanup().purgedFiles()).toBe(0);
    const [key] = stillThere;
    await age("delete from evidence_files");
    await age("update files set deleted_at = now() - interval '8 days'");
    const disk = existsSync(join(storageDir, key?.storage_key ?? "x"));
    expect(disk).toBe(true);
    expect(await cleanup().purgedFiles()).toBe(3);
    expect(existsSync(join(storageDir, key?.storage_key ?? "x"))).toBe(false);
    expect(await count("files")).toBe(0);
  });

  it("xóa bản nháp quá 12 tháng", async () => {
    const cookie = await login("chu@example.com");
    await api()
      .put("/api/v1/drafts")
      .set("Cookie", cookie)
      .send({ reportCode: null, schemaVersion: 2, data: DRAFT })
      .expect(200);

    expect(await cleanup().staleDrafts()).toBe(0);
    await age("update report_drafts set updated_at = now() - interval '13 months'");
    expect(await cleanup().staleDrafts()).toBe(1);
    expect(await count("report_drafts")).toBe(0);
  });
});
