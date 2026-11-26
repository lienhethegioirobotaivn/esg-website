import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createDatabase } from "../src/database/client.js";
import { runMigrations } from "../src/database/migrate.js";
import { JobScheduler } from "../src/jobs/job-scheduler.js";
import { importQuestionBank } from "../src/question-bank/import-question-bank.js";
import { QUESTION_BANK_XLSX } from "../src/question-bank/question-bank-fixture.js";
import { hashText } from "../src/translation/hash.js";
import {
  TRANSLATOR,
  TranslatorError,
  type TranslationRequest,
  type Translator,
} from "../src/translation/translator.js";
import { adminSession } from "./helpers/admin-session.js";
import { createTestApp, resetState, type TestApp } from "./helpers/create-test-app.js";
import { createTemporaryDatabase, type TemporaryDatabase } from "./helpers/test-database.js";

class FakeTranslator implements Translator {
  readonly requests: TranslationRequest[] = [];
  failure: TranslatorError | null = null;
  rejected = new Set<string>();

  async translate(input: TranslationRequest): Promise<(string | null)[]> {
    this.requests.push(input);
    if (this.failure !== null) {
      throw this.failure;
    }
    return input.texts.map((text) => (this.rejected.has(text) ? null : `[${input.locale}] ${text}`));
  }

  reset(): void {
    this.requests.length = 0;
    this.failure = null;
    this.rejected = new Set();
  }
}

const translator = new FakeTranslator();
const STAT_LABEL = "Doanh nghiệp tham gia";

let database: TemporaryDatabase;
let testApp: TestApp;
let storageDir: string;
let editor: string;

function api() {
  return request(testApp.app.getHttpServer());
}

async function rows<T extends Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
  return (await database.pool.query<T>(sql, params)).rows;
}

async function row(text: string, locale: string) {
  const [found] = await rows<{
    auto_text: string | null;
    manual_text: string | null;
    failed_attempts: number;
    waiting: boolean | null;
  }>(
    "select auto_text, manual_text, failed_attempts, retry_after > now() as waiting from translations where source_hash = $1 and locale = $2",
    [hashText(text), locale],
  );
  return found;
}

function run(body: Record<string, unknown> = {}) {
  return api().post("/api/v1/admin/translations/run").set("Cookie", editor).send(body);
}

function setManual(locale: string, text: string, manualText: string | null) {
  return api()
    .put("/api/v1/admin/translations")
    .set("Cookie", editor)
    .send({ locale, items: [{ sourceHash: hashText(text), manualText }] });
}

async function saveStats(label: string) {
  await api()
    .put("/api/v1/admin/stats")
    .set("Cookie", editor)
    .send({ items: [{ value: "120+", label }] })
    .expect(200);
}

async function createPost(overrides: Record<string, unknown> = {}) {
  const response = await api()
    .post("/api/v1/admin/posts")
    .set("Cookie", editor)
    .send({
      section: "tin-tuc",
      slug: "bai-dich",
      category: "Tin ESG",
      title: "Bài cần dịch",
      summary: "Tóm tắt cần dịch",
      coverUrl: "",
      author: "Ban biên tập",
      readMinutes: 2,
      publishedAt: "2026-11-01",
      featured: false,
      popular: false,
      spotlight: false,
      status: "published",
      body: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              { type: "text", text: "Đoạn mở đầu " },
              { type: "text", text: "in đậm", marks: [{ type: "bold" }] },
            ],
          },
          {
            type: "image",
            attrs: {
              src: "https://example.com/a.png",
              alt: "Mô tả ảnh",
              caption: "Chú thích ảnh",
              align: "center",
              width: 100,
            },
          },
        ],
      },
      ...overrides,
    })
    .expect(201);
  return response.body as { id: string };
}

async function publishBank() {
  await importQuestionBank(createDatabase(database.pool), { source: QUESTION_BANK_XLSX, publish: true });
}

beforeAll(async () => {
  storageDir = await mkdtemp(join(tmpdir(), "esg-translate-"));
  database = await createTemporaryDatabase();
  await runMigrations(database.pool);
  testApp = await createTestApp(
    database.url,
    { STORAGE_DIR: storageDir, TRANSLATION_DAILY_LIMIT: "5000" },
    [{ token: TRANSLATOR, value: translator }],
  );
});

afterAll(async () => {
  await testApp.close();
  await database.drop();
  await rm(storageDir, { recursive: true, force: true });
});

beforeEach(async () => {
  await resetState(database.pool);
  translator.reset();
  editor = await adminSession(testApp.app, database.pool, "content");
});

describe("chạy dịch", () => {
  it("dịch toàn bộ khảo sát cho ba ngôn ngữ và giữ nguyên mã", async () => {
    await publishBank();
    const before = await api().get("/api/v1/survey-bank?locale=en").expect(200);

    const result = await run().expect(200);
    expect(result.body).toMatchObject({ configured: true, stoppedReason: null });
    for (const locale of ["en", "fr", "zh"]) {
      const progress = result.body.locales[locale];
      expect(progress.total).toBeGreaterThan(300);
      expect(progress.remaining).toBe(0);
    }
    expect(translator.requests.every((item) => item.texts.length <= 40)).toBe(true);
    expect(translator.requests.some((item) => item.texts.includes("Môi trường"))).toBe(false);

    const vietnamese = await api().get("/api/v1/survey-bank").expect(200);
    const english = await api().get("/api/v1/survey-bank?locale=en").expect(200);
    expect(english.headers["etag"]).not.toBe(before.headers["etag"]);
    expect(english.body.survey[0].name).toBe("Environmental");
    const viQuestion = vietnamese.body.survey[0].groups[0].questions[0];
    const enQuestion = english.body.survey[0].groups[0].questions[0];
    expect(enQuestion.id).toBe(viQuestion.id);
    expect(enQuestion.text).toBe(`[en] ${viQuestion.text}`);
    expect(english.body.profile[0].text).toBe(`[en] ${vietnamese.body.profile[0].text}`);

    translator.reset();
    const again = await run().expect(200);
    expect(again.body.requests).toBe(0);
  });

  it("dịch bài đã đăng và nhãn số liệu, bỏ qua bản nháp", async () => {
    await createPost();
    await createPost({ slug: "nhap", title: "Bản nháp bí mật", status: "draft" });
    await saveStats(STAT_LABEL);

    const untranslated = await api().get("/api/v1/posts/tin-tuc/bai-dich?locale=en").expect(200);
    expect(untranslated.body.title).toBe("Bài cần dịch");

    const result = await run({ locale: "en" }).expect(200);
    expect(Object.keys(result.body.locales)).toEqual(["en"]);
    expect(await row("Bản nháp bí mật", "en")).toBeUndefined();
    expect((await row("Bài cần dịch", "fr"))?.auto_text).toBeNull();

    const detail = await api().get("/api/v1/posts/tin-tuc/bai-dich?locale=en").expect(200);
    expect(detail.body.title).toBe("[en] Bài cần dịch");
    expect(detail.body.body.content[0].content[0].text).toBe("[en] Đoạn mở đầu ");
    expect(detail.body.body.content[0].content[1]).toMatchObject({
      text: "[en] in đậm",
      marks: [{ type: "bold" }],
    });
    expect(detail.body.body.content[1].attrs).toMatchObject({
      src: "https://example.com/a.png",
      alt: "[en] Mô tả ảnh",
      caption: "[en] Chú thích ảnh",
    });
    const list = await api().get("/api/v1/posts?locale=en").expect(200);
    expect(list.body.posts[0].summary).toBe("[en] Tóm tắt cần dịch");
    const stats = await api().get("/api/v1/stats?locale=en").expect(200);
    expect(stats.body.items[0]).toEqual({ value: "120+", label: `[en] ${STAT_LABEL}` });
  });

  it("câu trả về không hợp lệ thì chờ rồi mới thử lại", async () => {
    await saveStats(STAT_LABEL);
    translator.rejected.add(STAT_LABEL);

    const first = await run({ locale: "en" }).expect(200);
    expect(first.body.locales.en.remaining).toBe(1);
    expect(await row(STAT_LABEL, "en")).toMatchObject({ auto_text: null, failed_attempts: 1, waiting: true });

    const waiting = await run({ locale: "en" }).expect(200);
    expect(waiting.body.requests).toBe(0);

    translator.rejected.clear();
    const retried = await run({ locale: "en", retryFailed: true }).expect(200);
    expect(retried.body.locales.en.remaining).toBe(0);
    expect(await row(STAT_LABEL, "en")).toMatchObject({ failed_attempts: 0, waiting: null });
  });

  it("dừng khi nhà cung cấp báo quá hạn mức hoặc lỗi, không tính là lỗi của câu", async () => {
    await saveStats(STAT_LABEL);
    translator.failure = new TranslatorError("quá hạn mức", true);
    const limited = await run().expect(200);
    expect(limited.body).toMatchObject({ stoppedReason: "rate_limited", requests: 1 });

    translator.failure = new TranslatorError("hỏng");
    const failed = await run().expect(200);
    expect(failed.body.stoppedReason).toBe("error");
    expect(await row(STAT_LABEL, "en")).toMatchObject({ auto_text: null, failed_attempts: 0 });
  });

  it("không chạy chồng hai lượt", async () => {
    const client = await database.pool.connect();
    try {
      await client.query("select pg_advisory_lock(hashtext('translation:run'))");
      const busy = await run().expect(409);
      expect(busy.body.error.code).toBe("translation_running");
      await run({ prune: true }).expect(409);
    } finally {
      await client.query("select pg_advisory_unlock(hashtext('translation:run'))");
      client.release();
    }
  });

  it("việc nền dịch phần còn thiếu", async () => {
    await saveStats(STAT_LABEL);
    expect(await testApp.app.get(JobScheduler).runOnce("translate-content")).toBe("ran");
    expect((await row(STAT_LABEL, "zh"))?.auto_text).toBe(`[zh] ${STAT_LABEL}`);
  });

  it("chỉ vai trò nội dung được dùng và từ chối tham số lạ", async () => {
    await api().get("/api/v1/admin/translations?locale=en").expect(401);
    const ops = await adminSession(testApp.app, database.pool, "ops");
    await api().post("/api/v1/admin/translations/run").set("Cookie", ops).send({}).expect(403);
    await run({ locale: "vi" }).expect(400);
    await run({ other: true }).expect(400);
  });
});

describe("bản dịch sửa tay", () => {
  it("bản sửa tay được ưu tiên hơn bảng thuật ngữ và bản dịch máy", async () => {
    await saveStats(STAT_LABEL);
    await createPost({ title: "Môi trường" });
    await run().expect(200);

    const listed = await api()
      .get("/api/v1/admin/translations?locale=en&q=tham%20gia")
      .set("Cookie", editor)
      .expect(200);
    expect(listed.body).toMatchObject({ total: 1, configured: true });
    expect(listed.body.items[0]).toMatchObject({ sourceText: STAT_LABEL, status: "auto" });

    await setManual("en", STAT_LABEL, "Participating businesses").expect(200);
    await setManual("en", "Môi trường", "Environment").expect(200);
    const stats = await api().get("/api/v1/stats?locale=en").expect(200);
    expect(stats.body.items[0].label).toBe("Participating businesses");
    const posts = await api().get("/api/v1/posts?locale=en").expect(200);
    expect(posts.body.posts[0].title).toBe("Environment");

    const dictionary = await api().get("/api/v1/translations?locale=en").expect(200);
    expect(dictionary.body.items[hashText(STAT_LABEL)]).toBe("Participating businesses");
    expect(dictionary.body.items[hashText("Môi trường")]).toBe("Environment");
    expect(dictionary.body.items[hashText("Xã hội")]).toBe("Social");
    await api()
      .get("/api/v1/translations?locale=en")
      .set("If-None-Match", dictionary.headers["etag"] ?? "")
      .expect(304);

    const manual = await api()
      .get("/api/v1/admin/translations?locale=en&status=manual")
      .set("Cookie", editor)
      .expect(200);
    expect(manual.body.total).toBe(2);

    await setManual("en", STAT_LABEL, null).expect(200);
    await setManual("en", "Môi trường", null).expect(200);
    const restored = await api().get("/api/v1/stats?locale=en").expect(200);
    expect(restored.body.items[0].label).toBe(`[en] ${STAT_LABEL}`);
    const glossary = await api().get("/api/v1/posts?locale=en").expect(200);
    expect(glossary.body.posts[0].title).toBe("Environmental");

    const missing = await api()
      .get("/api/v1/admin/translations?locale=en&status=missing")
      .set("Cookie", editor)
      .expect(200);
    expect(missing.body.total).toBe(0);
  });

  it("từ chối câu không biết và không lưu dở dang", async () => {
    await saveStats(STAT_LABEL);
    await run().expect(200);
    const response = await api()
      .put("/api/v1/admin/translations")
      .set("Cookie", editor)
      .send({
        locale: "en",
        items: [
          { sourceHash: hashText(STAT_LABEL), manualText: "Sửa" },
          { sourceHash: "0123456789abcdef", manualText: "Lạ" },
        ],
      })
      .expect(404);
    expect(response.body.error.code).toBe("translation_not_found");
    expect((await row(STAT_LABEL, "en"))?.manual_text).toBeNull();
    await api().get("/api/v1/translations?locale=vi").expect(400);
    await api().get("/api/v1/translations").expect(400);
  });
});

describe("dọn bản dịch thừa", () => {
  it("xóa bản dịch máy không còn dùng, giữ bản sửa tay và nội dung còn lại", async () => {
    await publishBank();
    await saveStats("Nhãn cũ thứ nhất");
    await run({ locale: "en" }).expect(200);
    await createPost({ slug: "nhap", title: "Bản nháp còn giữ", status: "draft" });
    await database.pool.query(
      "insert into translations (source_hash, locale, source_text, auto_text) values ($1, 'en', $2, 'Kept draft')",
      [hashText("Bản nháp còn giữ"), "Bản nháp còn giữ"],
    );
    await setManual("fr", "Nhãn cũ thứ nhất", "Ancien libellé").expect(200);
    await saveStats("Nhãn mới");

    expect(await testApp.app.get(JobScheduler).runOnce("prune-translations")).toBe("ran");
    expect(await row("Nhãn cũ thứ nhất", "en")).toBeDefined();

    const pruned = await run({ prune: true }).expect(200);
    expect(pruned.body).toEqual({ removed: 2, keptManual: 1, skipped: false });
    expect(await row("Nhãn cũ thứ nhất", "en")).toBeUndefined();
    expect((await row("Nhãn cũ thứ nhất", "fr"))?.manual_text).toBe("Ancien libellé");
    expect(await row("Bản nháp còn giữ", "en")).toBeDefined();
    expect((await rows("select 1 from translations")).length).toBeGreaterThan(300);
  });

  it("không xóa gì khi chưa có bộ câu hỏi xuất bản", async () => {
    await saveStats(STAT_LABEL);
    await run().expect(200);
    await saveStats("Nhãn khác");

    const pruned = await run({ prune: true }).expect(200);
    expect(pruned.body).toEqual({ removed: 0, keptManual: 0, skipped: true });
    expect(await row(STAT_LABEL, "en")).toBeDefined();
  });
});

describe("cấu hình", () => {
  it("chưa có khóa Gemini thì chỉ đồng bộ câu nguồn", async () => {
    await saveStats(STAT_LABEL);
    const plain = await createTestApp(database.url, { STORAGE_DIR: storageDir });
    try {
      const cookie = await adminSession(plain.app, database.pool, "content");
      const result = await request(plain.app.getHttpServer())
        .post("/api/v1/admin/translations/run")
        .set("Cookie", cookie)
        .send({})
        .expect(200);
      expect(result.body).toMatchObject({ configured: false, requests: 0, stoppedReason: null });
      expect(result.body.locales.en).toEqual({ total: 1, translated: 0, remaining: 1 });
      expect(await rows("select 1 from translations")).toHaveLength(3);
    } finally {
      await plain.close();
    }
  });

  it("tôn trọng giới hạn số lượt gọi mỗi ngày", async () => {
    await saveStats(STAT_LABEL);
    const limited = await createTestApp(
      database.url,
      { STORAGE_DIR: storageDir, TRANSLATION_DAILY_LIMIT: "1" },
      [{ token: TRANSLATOR, value: translator }],
    );
    try {
      const cookie = await adminSession(limited.app, database.pool, "content");
      const result = await request(limited.app.getHttpServer())
        .post("/api/v1/admin/translations/run")
        .set("Cookie", cookie)
        .send({})
        .expect(200);
      expect(result.body).toMatchObject({ stoppedReason: "daily_limit", requests: 1 });
      expect(translator.requests).toHaveLength(1);
    } finally {
      await limited.close();
    }
  });
});
