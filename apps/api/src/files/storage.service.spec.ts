import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { AppEnv } from "../config/env.schema.js";
import { StorageService } from "./storage.service.js";

let root: string;
let storage: StorageService;

beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), "esg-storage-unit-"));
  storage = new StorageService({ STORAGE_DIR: root } as AppEnv);
});

afterAll(async () => {
  await rm(root, { recursive: true, force: true });
});

describe("StorageService", () => {
  it("ghi tệp vào thư mục năm/tháng với tên ngẫu nhiên và đọc lại đúng nội dung", async () => {
    const key = await storage.write(Buffer.from("nội dung"), new Date(Date.UTC(2026, 2, 5)));

    expect(key).toMatch(/^2026\/03\/[0-9a-f-]{36}$/);
    expect(await readFile(storage.pathOf(key), "utf8")).toBe("nội dung");
    const chunks: Buffer[] = [];
    for await (const chunk of storage.open(key)) {
      chunks.push(chunk as Buffer);
    }
    expect(Buffer.concat(chunks).toString("utf8")).toBe("nội dung");
  });

  it("xóa tệp và bỏ qua khi tệp không còn", async () => {
    const key = await storage.write(Buffer.from("x"));
    await storage.remove(key);
    await expect(stat(storage.pathOf(key))).rejects.toThrow();
    await expect(storage.remove(key)).resolves.toBeUndefined();
  });

  it("từ chối khóa lạ hoặc cố thoát khỏi thư mục lưu trữ", () => {
    for (const key of ["../etc/passwd", "2026/03/../../x", "2026/03/abc", "/etc/passwd", ""]) {
      expect(() => storage.pathOf(key)).toThrow();
    }
  });
});
