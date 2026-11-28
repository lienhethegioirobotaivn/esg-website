import type { BankDetail, BankImportResult, BankQuestionView } from "@esg/shared/node";
import ExcelJS from "exceljs";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createDatabase } from "../src/database/client.js";
import { runMigrations } from "../src/database/migrate.js";
import { importQuestionBank } from "../src/question-bank/import-question-bank.js";
import { QUESTION_BANK_XLSX } from "../src/question-bank/question-bank-fixture.js";
import { adminSession } from "./helpers/admin-session.js";
import { createTestApp, resetState, type TestApp } from "./helpers/create-test-app.js";
import { createTemporaryDatabase, type TemporaryDatabase } from "./helpers/test-database.js";

const BASE = "/api/v1/admin/question-banks";

let database: TemporaryDatabase;
let testApp: TestApp;
let cookie: string;

function http() {
  return request(testApp.app.getHttpServer());
}

function get(path: string) {
  return http().get(`${BASE}${path}`).set("Cookie", cookie);
}

function post(path: string, body: object = {}) {
  return http().post(`${BASE}${path}`).set("Cookie", cookie).send(body);
}

function patch(path: string, body: object) {
  return http().patch(`${BASE}${path}`).set("Cookie", cookie).send(body);
}

async function published(): Promise<string> {
  const outcome = await importQuestionBank(createDatabase(database.pool), {
    source: QUESTION_BANK_XLSX,
    version: "0.1",
    publish: true,
  });
  return outcome.summary.bankId;
}

async function draft(): Promise<BankDetail> {
  await published();
  const response = await post("").expect(201);
  return response.body as BankDetail;
}

function find(detail: BankDetail, code: string): BankQuestionView {
  const question = detail.questions.find((item) => item.code === code);
  if (question === undefined) {
    throw new Error(`Thiếu câu ${code}`);
  }
  return question;
}

function ofSource(detail: BankDetail, source: string): BankQuestionView[] {
  return detail.questions.filter((item) => item.source === source);
}

function expectValidGroups(detail: BankDetail): void {
  const sizes = new Map<string, number>();
  for (const question of detail.questions) {
    sizes.set(question.groupCode, (sizes.get(question.groupCode) ?? 0) + 1);
  }
  expect(Math.max(...sizes.values())).toBeLessThanOrEqual(5);
  expect([...sizes.keys()].sort()).toEqual(detail.groups.map((group) => group.code).sort());
  for (const source of new Set(detail.questions.map((item) => item.source))) {
    expect(ofSource(detail, source).map((item) => item.position)).toEqual(
      ofSource(detail, source).map((_, index) => index + 1),
    );
  }
}

async function binary(path: string): Promise<Buffer> {
  const response = await get(path)
    .buffer(true)
    .parse((stream, done) => {
      const parts: Buffer[] = [];
      stream.on("data", (part: Buffer) => parts.push(part));
      stream.on("end", () => done(null, Buffer.concat(parts)));
    })
    .expect(200);
  return response.body as Buffer;
}

function sheetOf(workbook: ExcelJS.Workbook, name: string): ExcelJS.Worksheet {
  const sheet = workbook.getWorksheet(name);
  if (sheet === undefined) {
    throw new Error(`Thiếu tab ${name}`);
  }
  return sheet;
}

function importFile(buffer: Buffer, fields: Record<string, string> = {}) {
  let call = http().post(`${BASE}/import`).set("Cookie", cookie);
  for (const [key, value] of Object.entries(fields)) {
    call = call.field(key, value);
  }
  return call.attach("file", buffer, "bo-cau-hoi.xlsx");
}

beforeAll(async () => {
  database = await createTemporaryDatabase();
  await runMigrations(database.pool);
  testApp = await createTestApp(database.url);
});

afterAll(async () => {
  await testApp.close();
  await database.drop();
});

beforeEach(async () => {
  await resetState(database.pool);
  cookie = await adminSession(testApp.app, database.pool, "content");
});

describe("quyền truy cập bộ câu hỏi", () => {
  it("chặn người chưa đăng nhập và vai trò vận hành", async () => {
    await http().get(BASE).expect(401);
    cookie = await adminSession(testApp.app, database.pool, "ops");
    await get("").expect(403);
  });
});

describe("phiên bản", () => {
  it("nhân bản phiên bản đang xuất bản thành bản nháp giống hệt", async () => {
    const detail = await draft();

    expect(detail.bank).toMatchObject({ version: "0.2", status: "draft" });
    expect(detail.bank.counts).toMatchObject({ total: 175, approved: 173, pending: 2 });
    expect(detail.groups).toHaveLength(40);
    expect(find(detail, "C-002")).toMatchObject({ isNew: false, usedByReport: true, unit: "kWh" });
    expectValidGroups(detail);
  });

  it("không sửa được phiên bản đang xuất bản", async () => {
    const bankId = await published();
    const detail = (await get(`/${bankId}`).expect(200)).body as BankDetail;
    const response = await patch(`/${bankId}/questions/${find(detail, "C-001").id}`, {
      text: "Đổi nội dung",
    }).expect(409);

    expect(response.body.error.code).toBe("bank_locked");
    await http().delete(`${BASE}/${bankId}`).set("Cookie", cookie).expect(409);
  });

  it("đổi số phiên bản và xóa bản nháp", async () => {
    const detail = await draft();
    await patch(`/${detail.bank.id}`, { version: "0.1" }).expect(409);
    const renamed = await patch(`/${detail.bank.id}`, { version: "1.0", note: "Đợt mới" }).expect(200);
    expect(renamed.body.bank).toMatchObject({ version: "1.0", note: "Đợt mới" });

    await http().delete(`${BASE}/${detail.bank.id}`).set("Cookie", cookie).expect(204);
    const left = await database.pool.query("select count(*)::int as n from questions");
    expect(left.rows[0].n).toBe(175);
  });

  it("chỉ báo thay đổi cho câu bị sửa, thêm hoặc chuyển chỗ", async () => {
    const detail = await draft();
    const bankId = detail.bank.id;
    const inserted = await post(`/${bankId}/questions`, {
      source: "COMMON",
      text: "Câu chèn ở đầu tab",
      pillar: "E",
      afterId: null,
    }).expect(201);
    const added = ofSource(inserted.body, "COMMON")[0]?.code;

    const first = await post(`/${bankId}/validate`).expect(200);
    expect(first.body.changes.added).toEqual([added]);
    expect(first.body.changes.changed).toEqual([]);

    const ids = ofSource(inserted.body, "COMMON").map((question) => question.id);
    const target = find(inserted.body, "C-002");
    const order = [...ids.filter((id) => id !== target.id), target.id];
    await http()
      .put(`${BASE}/${bankId}/order`)
      .set("Cookie", cookie)
      .send({ source: "COMMON", ids: order })
      .expect(200);

    const second = await post(`/${bankId}/validate`).expect(200);
    expect(second.body.changes.changed).toEqual(["C-002"]);
  });

  it("xuất bản bản nháp, lưu trữ bản cũ và dùng lại được bản cũ", async () => {
    const detail = await draft();
    const target = find(detail, "C-001");
    await patch(`/${detail.bank.id}/questions/${target.id}`, { text: "Nội dung mới của C-001" }).expect(200);

    const check = await post(`/${detail.bank.id}/validate`).expect(200);
    expect(check.body.ok).toBe(true);
    expect(check.body.changes).toEqual({ comparedTo: "0.1", added: [], removed: [], changed: ["C-001"] });

    await post(`/${detail.bank.id}/publish`).expect(200);
    const survey = await http().get("/api/v1/survey-bank").expect(200);
    expect(survey.body.version).toBe("0.2");
    expect(JSON.stringify(survey.body.survey)).toContain("Nội dung mới của C-001");

    const list = await get("").expect(200);
    const old = list.body.banks.find((bank: { version: string }) => bank.version === "0.1");
    expect(old.status).toBe("archived");
    await post(`/${old.id}/publish`).expect(200);
    expect((await http().get("/api/v1/survey-bank").expect(200)).body.version).toBe("0.1");
  });

  it("từ chối xuất bản khi còn lỗi", async () => {
    const detail = await draft();
    const ids = detail.questions.map((question) => question.id);
    await post(`/${detail.bank.id}/questions/bulk`, { ids, patch: { reviewStatus: "pending" } }).expect(200);

    const response = await post(`/${detail.bank.id}/publish`).expect(400);
    expect(response.body.error.code).toBe("bank_invalid");
  });
});

describe("soạn câu hỏi", () => {
  it("thêm câu ở cuối tab, tự cấp mã và tự xếp nhóm", async () => {
    const detail = await draft();
    const response = await post(`/${detail.bank.id}/questions`, {
      source: "MAN",
      pillar: "E",
      topic: "Nước",
      text: "Cơ sở có đo lượng nước tái sử dụng không?",
    }).expect(201);
    const next = response.body as BankDetail;
    const added = find(next, "MAN-013");

    expect(detail.nextCodes.MAN).toBe("MAN-013");
    expect(added).toMatchObject({
      position: 13,
      inputType: "PRACTICE",
      reviewStatus: "pending",
      isNew: true,
      capabilities: ["machinery", "chemicals"],
    });
    expect(added.evidenceRule).toEqual({ code: "EV-PRACTICE" });
    expect(next.nextCodes.MAN).toBe("MAN-014");
    expectValidGroups(next);
  });

  it("chèn câu sau một câu bất kỳ mà nhóm vẫn tối đa 5 câu", async () => {
    const detail = await draft();
    const after = find(detail, "C-002");
    const response = await post(`/${detail.bank.id}/questions`, {
      source: "COMMON",
      pillar: "E",
      topic: "Năng lượng",
      text: "Câu chèn giữa",
      afterId: after.id,
      reviewStatus: "approved",
    }).expect(201);
    const next = response.body as BankDetail;
    const added = ofSource(next, "COMMON")[2];

    expect(added).toMatchObject({ code: "C-061", reviewedBy: "Tên content" });
    expect(added?.reviewedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expectValidGroups(next);
  });

  it("từ chối mã sai dạng, mã trùng và câu ESG thiếu trụ cột", async () => {
    const detail = await draft();
    const base = { source: "COMMON", text: "Câu thử" };
    expect((await post(`/${detail.bank.id}/questions`, base).expect(400)).body.error.code).toBe(
      "pillar_required",
    );
    await post(`/${detail.bank.id}/questions`, { ...base, pillar: "E", code: "MAN-100" }).expect(400);
    await post(`/${detail.bank.id}/questions`, { ...base, pillar: "E", code: "C-001" }).expect(409);
    await post(`/${detail.bank.id}/questions`, { ...base, pillar: "E", inputType: "SECTOR" }).expect(400);
  });

  it("sửa mọi cột, tự ghi người duyệt và xóa bản dịch cũ khi đổi nội dung", async () => {
    const detail = await draft();
    const target = find(detail, "C-001");
    await database.pool.query(
      "insert into question_texts (question_id, locale, text) values ($1, 'en', 'Old')",
      [target.id],
    );
    await patch(`/${detail.bank.id}/questions/${target.id}`, { reviewStatus: "changes", reviewNote: "Cần rõ hơn" }).expect(200);
    const response = await patch(`/${detail.bank.id}/questions/${target.id}`, {
      text: "Nội dung đã sửa",
      topic: "Chủ đề mới",
      pillar: "S",
      guidance: "",
      inputType: "NUMBER",
      unit: "lần",
      required: false,
      declarationLevel: "extended",
      reportSection: "R03",
      sourceRef: "SRC-09",
      reviewStatus: "approved",
      rolloutStatus: "testing",
      evidenceRule: {
        code: "EV-DATA",
        accepted: "Bảng tổng hợp",
        approval: "Đã duyệt",
        testCases: [{ scenario: "Đủ hồ sơ", expected: "Phù hợp sơ bộ" }, {}],
      },
    }).expect(200);
    const next = find(response.body as BankDetail, "C-001");

    expect(next).toMatchObject({
      text: "Nội dung đã sửa",
      topic: "Chủ đề mới",
      pillar: "S",
      guidance: "",
      inputType: "NUMBER",
      unit: "lần",
      required: false,
      declarationLevel: "extended",
      reviewNote: "Cần rõ hơn",
      reviewedBy: "Tên content",
      rolloutStatus: "testing",
    });
    expect(next.evidenceRule?.testCases).toHaveLength(1);
    expect(next.evidenceRule?.testCases?.[0]?.id).toMatch(/^AI-\d{3}$/);
    const texts = await database.pool.query(
      "select 1 from question_texts where question_id = $1",
      [target.id],
    );
    expect(texts.rowCount).toBe(0);
  });

  it("chỉ đổi được mã của câu chưa từng xuất bản", async () => {
    const detail = await draft();
    await patch(`/${detail.bank.id}/questions/${find(detail, "C-001").id}`, { code: "C-099" }).expect(409);
    const added = (
      await post(`/${detail.bank.id}/questions`, { source: "COMMON", pillar: "G", text: "Mới" }).expect(201)
    ).body as BankDetail;
    const renamed = await patch(`/${detail.bank.id}/questions/${find(added, "C-061").id}`, {
      code: "C-099",
    }).expect(200);
    expect(find(renamed.body as BankDetail, "C-099").isNew).toBe(true);
  });

  it("đổi thứ tự trong một tab và từ chối danh sách thiếu câu", async () => {
    const detail = await draft();
    const ids = ofSource(detail, "MAN").map((question) => question.id);
    const reversed = [...ids].reverse();
    const response = await http()
      .put(`${BASE}/${detail.bank.id}/order`)
      .set("Cookie", cookie)
      .send({ source: "MAN", ids: reversed })
      .expect(200);

    expect(ofSource(response.body as BankDetail, "MAN").map((question) => question.id)).toEqual(reversed);
    expectValidGroups(response.body as BankDetail);
    await http()
      .put(`${BASE}/${detail.bank.id}/order`)
      .set("Cookie", cookie)
      .send({ source: "MAN", ids: ids.slice(1) })
      .expect(409);
  });

  it("xóa nhiều câu thì dọn nhóm rỗng và cảnh báo câu báo cáo đang dùng", async () => {
    const detail = await draft();
    const group = find(detail, "C-001").groupCode;
    const ids = detail.questions.filter((item) => item.groupCode === group).map((item) => item.id);
    const response = await post(`/${detail.bank.id}/questions/delete`, { ids }).expect(200);
    const next = response.body as BankDetail;

    expect(next.questions).toHaveLength(170);
    expect(next.groups.map((item) => item.code)).not.toContain(group);
    expectValidGroups(next);
    const check = await post(`/${detail.bank.id}/validate`).expect(200);
    expect(check.body.changes.removed).toContain("C-001");
    expect(
      check.body.issues.some(
        (issue: { code: string; severity: string }) => issue.code === "C-001" && issue.severity === "warning",
      ),
    ).toBe(true);
  });

  it("đổi trạng thái hàng loạt", async () => {
    const detail = await draft();
    const ids = ofSource(detail, "MAN").map((question) => question.id);
    const response = await post(`/${detail.bank.id}/questions/bulk`, {
      ids,
      patch: { reviewStatus: "rejected", declarationLevel: "extended" },
    }).expect(200);
    expect(
      ofSource(response.body as BankDetail, "MAN").every(
        (question) => question.reviewStatus === "rejected" && question.declarationLevel === "extended",
      ),
    ).toBe(true);
  });
});

describe("nhập và xuất Excel", () => {
  it("xuất rồi nhập lại giữ nguyên mọi trường", async () => {
    const detail = await draft();
    const target = find(detail, "C-002");
    await patch(`/${detail.bank.id}/questions/${target.id}`, {
      reviewStatus: "changes",
      reviewNote: "Góp ý, có \"dấu nháy\"",
      reviewedBy: "Anh Nhân",
      reviewedOn: "2026-11-20",
      rolloutStatus: "done",
      evidenceRule: {
        ...(target.evidenceRule ?? { code: "EV-DATA" }),
        reviewNote: "Góp ý quy tắc",
        reviewedBy: "Nhân",
        reviewedOn: "2026-11-21",
        testCases: [
          ...(target.evidenceRule?.testCases ?? []),
          { scenario: "Ca mới", result: "Đạt yêu cầu", testStatus: "Đạt", durationMs: "1200", costUsd: "0.01", runDate: "2026-11-22" },
        ],
      },
    }).expect(200);
    const before = (await get(`/${detail.bank.id}`).expect(200)).body as BankDetail;

    const file = await binary(`/${detail.bank.id}/export`);
    const result = (await importFile(file, { version: "9.9" }).expect(200)).body as BankImportResult;
    expect(result).toMatchObject({ ok: true, imported: true, questions: 175, groups: 40 });

    const after = (await get(`/${result.bankId}`).expect(200)).body as BankDetail;
    const strip = (value: BankDetail) => value.questions.map((question) => ({ ...question, id: "" }));
    expect(strip(after)).toEqual(strip(before));
    expect(after.groups).toEqual(before.groups);
  });

  it("kiểm tra thử không ghi dữ liệu và báo lỗi khi trùng phiên bản đã xuất bản", async () => {
    await published();
    const file = await binary(`/${(await get("").expect(200)).body.banks[0].id}/export`);

    const dry = await importFile(file, { version: "2.0", dryRun: "true" }).expect(200);
    expect(dry.body).toMatchObject({ ok: true, imported: false, replacesDraft: false });
    const clash = await importFile(file, { version: "0.1" }).expect(200);
    expect(clash.body).toMatchObject({ ok: false, imported: false });
    expect((await get("").expect(200)).body.banks).toHaveLength(1);
  });

  it("từ chối file không phải Excel và chỉ ra dòng lỗi", async () => {
    await importFile(Buffer.from("khong phai excel")).expect(400);

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(QUESTION_BANK_XLSX);
    sheetOf(workbook, "02 Chung").getCell("E7").value = "Sai trạng thái";
    const broken = Buffer.from(await workbook.xlsx.writeBuffer());
    const response = await importFile(broken, { dryRun: "true" }).expect(200);

    expect(response.body.ok).toBe(false);
    expect(response.body.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ severity: "error", tab: "02 Chung", row: 7, code: "C-001" }),
      ]),
    );
  });

  it("đọc góp ý, người duyệt và trạng thái Loại bỏ từ file", async () => {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(QUESTION_BANK_XLSX);
    const sheet = sheetOf(workbook, "02 Chung");
    sheet.getCell("D7").value = "Góp ý từ Sheet";
    sheet.getCell("E7").value = "Loại bỏ";
    sheet.getCell("K7").value = "Nhân";
    sheet.getCell("L7").value = "05/11/2026";
    const result = await importFile(Buffer.from(await workbook.xlsx.writeBuffer()), { version: "3.0" }).expect(200);
    const detail = (await get(`/${result.body.bankId}`).expect(200)).body as BankDetail;

    expect(find(detail, "C-001")).toMatchObject({
      reviewStatus: "rejected",
      reviewNote: "Góp ý từ Sheet",
      reviewedBy: "Nhân",
      reviewedOn: "2026-11-05",
    });
  });
});
