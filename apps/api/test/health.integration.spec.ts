import type { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { AppModule } from "../src/app.module.js";
import { configureApp } from "../src/app.setup.js";
import { runMigrations } from "../src/database/migrate.js";
import { createTemporaryDatabase, type TemporaryDatabase } from "./helpers/test-database.js";

let database: TemporaryDatabase;
let app: NestExpressApplication | undefined;

async function createApp(databaseUrl: string): Promise<NestExpressApplication> {
  process.env["DATABASE_URL"] = databaseUrl;
  process.env["DATABASE_POOL_MAX"] = "2";
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const instance = moduleRef.createNestApplication<NestExpressApplication>();
  configureApp(instance);
  await instance.init();
  return instance;
}

beforeAll(async () => {
  database = await createTemporaryDatabase();
  await runMigrations(database.pool);
});

afterEach(async () => {
  await app?.close();
  app = undefined;
});

afterAll(async () => {
  await database.drop();
});

describe("GET /api/v1/health", () => {
  it("trả 200 khi database sẵn sàng", async () => {
    app = await createApp(database.url);

    const response = await request(app.getHttpServer()).get("/api/v1/health");

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ status: "ok", database: "up" });
  });

  it("trả 503 khi không kết nối được database", async () => {
    app = await createApp("postgres://esg:esg@127.0.0.1:1/esg");

    const response = await request(app.getHttpServer()).get("/api/v1/health");

    expect(response.status).toBe(503);
    expect(response.body).toMatchObject({ status: "error", database: "down" });
  });

  it("không lộ tiêu đề X-Powered-By", async () => {
    app = await createApp(database.url);

    const response = await request(app.getHttpServer()).get("/api/v1/health");

    expect(response.headers["x-powered-by"]).toBeUndefined();
  });

  it("không có route /health nằm ngoài tiền tố api/v1", async () => {
    app = await createApp(database.url);

    const response = await request(app.getHttpServer()).get("/health");

    expect(response.status).toBe(404);
  });

  it("chạy migration khi khởi động nếu RUN_MIGRATIONS_ON_START=true", async () => {
    const fresh = await createTemporaryDatabase();
    try {
      process.env["RUN_MIGRATIONS_ON_START"] = "true";
      app = await createApp(fresh.url);

      const tables = await fresh.pool.query(
        "select 1 from information_schema.tables where table_schema = 'public' and table_name = 'users'",
      );
      expect(tables.rowCount).toBe(1);
    } finally {
      delete process.env["RUN_MIGRATIONS_ON_START"];
      await app?.close();
      app = undefined;
      await fresh.drop();
    }
  });
});
