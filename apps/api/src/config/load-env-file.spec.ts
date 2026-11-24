import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { loadEnvFile } from "./load-env-file.js";

const KEY = "ESG_TEST_LOAD_ENV_FILE";

describe("loadEnvFile", () => {
  let directory: string;
  let originalMode: string | undefined;

  beforeEach(() => {
    directory = mkdtempSync(join(tmpdir(), "esg-env-"));
    originalMode = process.env["NODE_ENV"];
    delete process.env[KEY];
  });

  afterEach(() => {
    rmSync(directory, { recursive: true, force: true });
    delete process.env[KEY];
    if (originalMode === undefined) {
      delete process.env["NODE_ENV"];
    } else {
      process.env["NODE_ENV"] = originalMode;
    }
  });

  it("nạp biến từ file khi NODE_ENV là development hoặc chưa đặt", () => {
    const file = join(directory, ".env");
    writeFileSync(file, `${KEY}=from-file\n`);

    delete process.env["NODE_ENV"];
    loadEnvFile(file);

    expect(process.env[KEY]).toBe("from-file");
  });

  it("không ghi đè biến đã có trong môi trường", () => {
    const file = join(directory, ".env");
    writeFileSync(file, `${KEY}=from-file\n`);
    process.env["NODE_ENV"] = "development";
    process.env[KEY] = "from-shell";

    loadEnvFile(file);

    expect(process.env[KEY]).toBe("from-shell");
  });

  it("bỏ qua khi NODE_ENV là test hoặc production", () => {
    const file = join(directory, ".env");
    writeFileSync(file, `${KEY}=from-file\n`);

    process.env["NODE_ENV"] = "production";
    loadEnvFile(file);
    process.env["NODE_ENV"] = "test";
    loadEnvFile(file);

    expect(process.env[KEY]).toBeUndefined();
  });

  it("không lỗi khi file không tồn tại", () => {
    process.env["NODE_ENV"] = "development";

    expect(() => loadEnvFile(join(directory, "khong-co.env"))).not.toThrow();
  });
});
