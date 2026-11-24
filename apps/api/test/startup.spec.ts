import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const apiRoot = fileURLToPath(new URL("..", import.meta.url));

function runMain(env: NodeJS.ProcessEnv) {
  return spawnSync(process.execPath, ["--import", "tsx", "src/main.ts"], {
    cwd: apiRoot,
    env: { PATH: process.env["PATH"] ?? "", NODE_ENV: "test", ...env },
    encoding: "utf8",
    timeout: 20000,
  });
}

describe("khởi động API", () => {
  it("thoát mã 1 và nêu rõ biến thiếu khi không có DATABASE_URL", () => {
    const result = runMain({});

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Biến môi trường không hợp lệ");
    expect(result.stderr).toContain("DATABASE_URL: bắt buộc, chưa được đặt");
  });

  it("thoát mã 1 khi PORT không hợp lệ", () => {
    const result = runMain({
      DATABASE_URL: "postgres://esg:esg@localhost:5432/esg",
      PORT: "abc",
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("PORT");
  });
});
