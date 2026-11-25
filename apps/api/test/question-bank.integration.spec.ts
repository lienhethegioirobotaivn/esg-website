import { HEADCOUNT_TIERS, INDUSTRY_SOURCES, selectSurvey, surveySchema, type Survey } from "@esg/shared/node";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createDatabase } from "../src/database/client.js";
import { runMigrations } from "../src/database/migrate.js";
import { importQuestionBank } from "../src/question-bank/import-question-bank.js";
import { QUESTION_BANK_XLSX } from "../src/question-bank/question-bank-fixture.js";
import { QuestionBankLockedError } from "../src/question-bank/question-bank-importer.js";
import { createTestApp, resetState, type TestApp } from "./helpers/create-test-app.js";
import { createTemporaryDatabase, type TemporaryDatabase } from "./helpers/test-database.js";

let database: TemporaryDatabase;
let testApp: TestApp;

function db() {
  return createDatabase(database.pool);
}

function importFixture(options: { version?: string; publish?: boolean } = {}) {
  return importQuestionBank(db(), { source: QUESTION_BANK_XLSX, ...options });
}

function ids(survey: Survey): string[] {
  return survey.flatMap((p) => p.groups.flatMap((g) => g.questions.map((q) => q.id))).sort();
}

async function count(table: string): Promise<number> {
  const result = await database.pool.query<{ n: string }>(`select count(*) as n from ${table}`);
  return Number(result.rows[0]?.n ?? 0);
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
});

describe("công cụ nhập ngân hàng câu hỏi", () => {
  it("nhập đủ 175 câu và 40 nhóm vào bản nháp", async () => {
    const outcome = await importFixture();

    expect(outcome.summary).toMatchObject({
      version: "0.1-draft",
      status: "draft",
      questions: 175,
      groups: 40,
      approved: 173,
      pending: 2,
      replacedDraft: false,
    });
    expect(await count("questions")).toBe(175);
    expect(await count("question_groups")).toBe(40);
  });

  it("lưu đầy đủ cột mở rộng: route, quy tắc minh chứng, đơn vị, bắt buộc", async () => {
    await importFixture();

    const result = await database.pool.query(
      "select source, pillar, unit, required, route, evidence_rule from questions where code in ('C-002','MAN-001','P-001') order by code",
    );
    const [c002, man001, p001] = result.rows;

    expect(c002).toMatchObject({ source: "COMMON", pillar: "E", unit: "kWh", required: true, route: {} });
    expect(c002.evidence_rule.code).toBe("EV-DATA");
    expect(man001.route).toEqual({ sector_any: ["MAN"], capability_any: ["machinery", "chemicals"] });
    expect(p001).toMatchObject({ source: "PROFILE", pillar: null });
  });

  it("nhập lại cùng phiên bản nháp thì thay thế, không nhân đôi", async () => {
    await importFixture();
    const again = await importFixture();

    expect(again.summary.replacedDraft).toBe(true);
    expect(await count("questions")).toBe(175);
    expect(await count("question_banks")).toBe(1);
  });

  it("xuất bản rồi thì không ghi đè cùng số phiên bản", async () => {
    await importFixture({ version: "0.1", publish: true });

    await expect(importFixture({ version: "0.1" })).rejects.toBeInstanceOf(QuestionBankLockedError);
    expect(await count("questions")).toBe(175);
  });

  it("xuất bản bản mới thì bản cũ chuyển sang lưu trữ", async () => {
    await importFixture({ version: "0.1", publish: true });
    const next = await importFixture({ version: "0.2", publish: true });

    expect(next.summary.archivedVersion).toBe("0.1");
    const statuses = await database.pool.query("select version, status from question_banks order by version");
    expect(statuses.rows).toEqual([
      { version: "0.1", status: "archived" },
      { version: "0.2", status: "published" },
    ]);
  });

  it("file sai thì không ghi gì vào database", async () => {
    await expect(
      importQuestionBank(db(), { source: Buffer.from("không phải xlsx") }),
    ).rejects.toThrow();
    expect(await count("question_banks")).toBe(0);
  });
});

describe("GET /api/v1/survey-bank", () => {
  it("trả 404 khi chưa có bản nào được xuất bản", async () => {
    await importFixture();

    const response = await request(testApp.app.getHttpServer()).get("/api/v1/survey-bank");

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("survey_bank_unavailable");
    expect(response.headers["cache-control"]).toBeUndefined();
  });

  it("trả bộ câu hỏi đã xuất bản kèm ETag và Cache-Control", async () => {
    await importFixture({ version: "0.1", publish: true });

    const response = await request(testApp.app.getHttpServer()).get("/api/v1/survey-bank");

    expect(response.status).toBe(200);
    expect(response.headers["etag"]).toMatch(/^W\/"0\.1-vi-/);
    expect(response.headers["cache-control"]).toContain("max-age=60");
    expect(response.body.version).toBe("0.1");
    expect(response.body.locale).toBe("vi");
    expect(() => surveySchema.parse(response.body.survey)).not.toThrow();
    expect(ids(response.body.survey)).toHaveLength(148);
    expect(response.body.profile).toHaveLength(25);
    expect(response.body.profile.map((q: { inputType: string }) => q.inputType)).toContain("CONSENT");
  });

  it("trả 304 khi If-None-Match khớp và 200 khi không khớp", async () => {
    await importFixture({ version: "0.1", publish: true });
    const server = testApp.app.getHttpServer();
    const first = await request(server).get("/api/v1/survey-bank");
    const etag = first.headers["etag"] as string;

    const cached = await request(server).get("/api/v1/survey-bank").set("If-None-Match", etag);
    const strong = await request(server).get("/api/v1/survey-bank").set("If-None-Match", etag.replace("W/", ""));
    const stale = await request(server).get("/api/v1/survey-bank").set("If-None-Match", 'W/"cu"');

    expect(cached.status).toBe(304);
    expect(cached.text).toBe("");
    expect(strong.status).toBe(304);
    expect(stale.status).toBe(200);
  });

  it("ETag đổi khi xuất bản phiên bản mới", async () => {
    const server = testApp.app.getHttpServer();
    await importFixture({ version: "0.1", publish: true });
    const before = (await request(server).get("/api/v1/survey-bank")).headers["etag"];
    await importFixture({ version: "0.2", publish: true });
    const after = await request(server).get("/api/v1/survey-bank").set("If-None-Match", before as string);

    expect(after.status).toBe(200);
    expect(after.body.version).toBe("0.2");
  });

  it("selectSurvey trên dữ liệu API cho đúng số câu theo ngành và quy mô", async () => {
    await importFixture({ version: "0.1", publish: true });
    const { body } = await request(testApp.app.getHttpServer()).get("/api/v1/survey-bank");
    const survey = body.survey as Survey;

    const base = ids(selectSurvey(survey, { industry: "other", headcount: "lt-10" }));
    const full = ids(selectSurvey(survey, { industry: "manufacturing", headcount: "gte-500" }));

    expect(Object.keys(INDUSTRY_SOURCES)).toHaveLength(8);
    expect(Object.keys(HEADCOUNT_TIERS)).toHaveLength(5);
    expect(base.every((id) => id.startsWith("C-") || id.startsWith("OTH-"))).toBe(true);
    expect(full.length).toBeGreaterThan(base.length);
    expect(full.filter((id) => id.startsWith("MAN-"))).toHaveLength(12);
  });

  it("locale khác dùng bản dịch nếu có và quay về tiếng Việt nếu thiếu", async () => {
    await importFixture({ version: "0.1", publish: true });
    await database.pool.query(
      `insert into question_texts (question_id, locale, text, guidance)
       select id, 'en', 'English text', 'English guidance' from questions where code = 'C-001'`,
    );
    const server = testApp.app.getHttpServer();

    const en = await request(server).get("/api/v1/survey-bank?locale=en");
    const fr = await request(server).get("/api/v1/survey-bank?locale=fr");
    const find = (survey: Survey, id: string) =>
      survey.flatMap((p) => p.groups.flatMap((g) => g.questions)).find((q) => q.id === id);

    expect(en.body.locale).toBe("en");
    expect(find(en.body.survey, "C-001")?.text).toBe("English text");
    expect(find(en.body.survey, "C-001")?.guidance.body).toBe("English guidance");
    expect(find(en.body.survey, "C-002")?.text).toContain("điện");
    expect(find(fr.body.survey, "C-001")?.text).not.toBe("English text");
    expect(en.headers["etag"]).not.toBe(fr.headers["etag"]);
  });

  it("từ chối locale không hỗ trợ bằng 400", async () => {
    const response = await request(testApp.app.getHttpServer()).get("/api/v1/survey-bank?locale=xx");

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("invalid_locale");
  });

  it("giới hạn 120 lượt mỗi phút cho mỗi địa chỉ", async () => {
    await importFixture({ version: "0.1", publish: true });
    const server = testApp.app.getHttpServer();
    const first = await request(server).get("/api/v1/survey-bank");
    const etag = first.headers["etag"] as string;

    for (let index = 1; index < 120; index += 1) {
      await request(server).get("/api/v1/survey-bank").set("If-None-Match", etag);
    }
    const blocked = await request(server).get("/api/v1/survey-bank");

    expect(blocked.status).toBe(429);
    expect(blocked.headers["retry-after"]).toBeDefined();
    expect(blocked.body.error.code).toBe("rate_limited");
  });
});
