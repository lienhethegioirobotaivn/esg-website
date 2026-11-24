import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createDatabase } from "../src/database/client.js";
import { runMigrations } from "../src/database/migrate.js";
import { RateLimitService } from "../src/rate-limit/rate-limit.service.js";
import { resetState } from "./helpers/create-test-app.js";
import { createTemporaryDatabase, type TemporaryDatabase } from "./helpers/test-database.js";

let database: TemporaryDatabase;
let service: RateLimitService;

beforeAll(async () => {
  database = await createTemporaryDatabase();
  await runMigrations(database.pool);
  service = new RateLimitService(createDatabase(database.pool));
});

beforeEach(async () => {
  await resetState(database.pool);
});

afterAll(async () => {
  await database.drop();
});

const rule = { key: "test:ip:1", limit: 3, windowSeconds: 600 };

describe("RateLimitService", () => {
  it("cho phép tới giới hạn rồi từ chối và báo thời gian chờ", async () => {
    const now = new Date("2026-11-24T10:03:00.000Z");

    const results = [];
    for (let index = 0; index < 4; index += 1) {
      results.push(await service.hit(rule, now));
    }

    expect(results.map((result) => result.allowed)).toEqual([true, true, true, false]);
    expect(results.map((result) => result.hits)).toEqual([1, 2, 3, 4]);
    expect(results[3]?.retryAfter).toBe(420);
  });

  it("sang cửa sổ mới thì đếm lại từ đầu", async () => {
    await service.hit(rule, new Date("2026-11-24T10:03:00.000Z"));
    await service.hit(rule, new Date("2026-11-24T10:04:00.000Z"));

    const next = await service.hit(rule, new Date("2026-11-24T10:10:01.000Z"));

    expect(next).toMatchObject({ allowed: true, hits: 1 });
  });

  it("khóa khác nhau đếm riêng; cùng khóa khác độ dài cửa sổ cũng đếm riêng", async () => {
    const now = new Date("2026-11-24T10:00:00.000Z");
    await service.hit(rule, now);
    await service.hit(rule, now);

    expect((await service.hit({ ...rule, key: "test:ip:2" }, now)).hits).toBe(1);
    expect((await service.hit({ ...rule, windowSeconds: 86_400 }, now)).hits).toBe(1);
  });

  it("đếm chính xác khi nhiều yêu cầu đồng thời", async () => {
    const now = new Date("2026-11-24T10:00:00.000Z");

    const results = await Promise.all(
      Array.from({ length: 20 }, () => service.hit({ ...rule, limit: 10 }, now)),
    );

    expect(results.map((result) => result.hits).sort((a, b) => a - b)).toEqual(
      Array.from({ length: 20 }, (_, index) => index + 1),
    );
    expect(results.filter((result) => result.allowed)).toHaveLength(10);
  });

  it("hitAll dừng ở quy tắc đầu tiên bị vượt và không tính các quy tắc sau", async () => {
    const now = new Date("2026-11-24T10:00:00.000Z");
    const ip = { key: "test:ip:9", limit: 1, windowSeconds: 600 };
    const day = { key: "test:day", limit: 100, windowSeconds: 86_400 };
    await service.hitAll([ip, day], now);

    const denied = await service.hitAll([ip, day], now);

    expect(denied.allowed).toBe(false);
    expect((await service.hit(day, now)).hits).toBe(2);
  });
});
