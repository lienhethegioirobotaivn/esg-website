import { describe, expect, it } from "vitest";

import { EnvValidationError, loadEnv } from "./env.schema.js";

const validSource = {
  DATABASE_URL: "postgres://esg:esg@localhost:5432/esg",
};

describe("loadEnv", () => {
  it("áp dụng giá trị mặc định khi chỉ có DATABASE_URL", () => {
    const env = loadEnv(validSource);

    expect(env).toEqual({
      NODE_ENV: "development",
      PORT: 3001,
      DATABASE_URL: validSource.DATABASE_URL,
      DATABASE_POOL_MAX: 10,
      RUN_MIGRATIONS_ON_START: false,
    });
  });

  it("đọc và ép kiểu các biến đã đặt", () => {
    const env = loadEnv({
      ...validSource,
      NODE_ENV: "production",
      PORT: "8080",
      DATABASE_POOL_MAX: "25",
      RUN_MIGRATIONS_ON_START: "true",
    });

    expect(env.NODE_ENV).toBe("production");
    expect(env.PORT).toBe(8080);
    expect(env.DATABASE_POOL_MAX).toBe(25);
    expect(env.RUN_MIGRATIONS_ON_START).toBe(true);
  });

  it("chấp nhận postgresql:// và coi chuỗi rỗng như chưa đặt", () => {
    const env = loadEnv({
      DATABASE_URL: "postgresql://esg:esg@db:5432/esg",
      PORT: "",
    });

    expect(env.PORT).toBe(3001);
  });

  it("từ chối khi thiếu DATABASE_URL và nêu rõ tên biến", () => {
    expect.assertions(3);
    try {
      loadEnv({});
    } catch (error) {
      expect(error).toBeInstanceOf(EnvValidationError);
      const validation = error as EnvValidationError;
      expect(validation.issues).toEqual(["DATABASE_URL: bắt buộc, chưa được đặt"]);
      expect(validation.message).toContain("API không khởi động");
    }
  });

  it("từ chối DATABASE_URL rỗng như thiếu", () => {
    expect(() => loadEnv({ DATABASE_URL: "" })).toThrow(EnvValidationError);
  });

  it("từ chối DATABASE_URL sai giao thức hoặc không phải địa chỉ", () => {
    expect(() => loadEnv({ DATABASE_URL: "mysql://root@localhost/esg" })).toThrow(
      /DATABASE_URL: phải là địa chỉ postgres/,
    );
    expect(() => loadEnv({ DATABASE_URL: "không phải địa chỉ" })).toThrow(EnvValidationError);
  });

  it("từ chối PORT, NODE_ENV và boolean không hợp lệ, báo đủ mọi lỗi", () => {
    expect.assertions(2);
    try {
      loadEnv({
        ...validSource,
        PORT: "70000",
        NODE_ENV: "staging",
        RUN_MIGRATIONS_ON_START: "yes",
      });
    } catch (error) {
      const validation = error as EnvValidationError;
      expect(validation.issues).toHaveLength(3);
      expect(validation.issues.map((issue) => issue.split(":")[0]).sort()).toEqual([
        "NODE_ENV",
        "PORT",
        "RUN_MIGRATIONS_ON_START",
      ]);
    }
  });
});
