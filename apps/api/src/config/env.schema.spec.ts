import { describe, expect, it } from "vitest";

import { EnvValidationError, loadEnv } from "./env.schema.js";

const validSource = {
  DATABASE_URL: "postgres://esg:esg@localhost:5432/esg",
};

describe("loadEnv", () => {
  it("áp dụng giá trị mặc định khi chỉ có DATABASE_URL", () => {
    const env = loadEnv(validSource);

    expect(env).toMatchObject({
      NODE_ENV: "development",
      PORT: 3001,
      DATABASE_URL: validSource.DATABASE_URL,
      DATABASE_POOL_MAX: 10,
      RUN_MIGRATIONS_ON_START: false,
      MAIL_PROVIDER: "console",
      MAIL_DAILY_LIMIT: 300,
      TRUSTED_PROXY: 0,
      JOBS_ENABLED: true,
      STORAGE_DIR: "./storage",
      PUBLIC_BASE_URL: "http://localhost:3000",
    });
    expect(env.SESSION_SECRET.length).toBeGreaterThanOrEqual(32);
  });

  it("đọc và ép kiểu các biến đã đặt", () => {
    const env = loadEnv({
      ...validSource,
      NODE_ENV: "production",
      SESSION_SECRET: "y".repeat(32),
      MAIL_PROVIDER: "brevo",
      MAIL_API_KEY: "khoa-thu-nghiem",
      MAIL_FROM: "no-reply@example.com",
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
  it("production bắt buộc SESSION_SECRET và cấm MAIL_PROVIDER=console", () => {
    expect.assertions(2);
    try {
      loadEnv({ ...validSource, NODE_ENV: "production" });
    } catch (error) {
      const issues = (error as EnvValidationError).issues;
      expect(issues.some((issue) => issue.startsWith("SESSION_SECRET: bắt buộc"))).toBe(true);
      expect(issues.some((issue) => issue.startsWith("MAIL_PROVIDER: không được"))).toBe(true);
    }
  });

  it("MAIL_PROVIDER=brevo bắt buộc MAIL_API_KEY và MAIL_FROM", () => {
    expect.assertions(2);
    try {
      loadEnv({ ...validSource, MAIL_PROVIDER: "brevo" });
    } catch (error) {
      const issues = (error as EnvValidationError).issues;
      expect(issues).toContain("MAIL_API_KEY: bắt buộc khi MAIL_PROVIDER=brevo");
      expect(issues).toContain("MAIL_FROM: bắt buộc khi MAIL_PROVIDER=brevo");
    }
  });

  it("chấp nhận cấu hình production đầy đủ với Brevo", () => {
    const env = loadEnv({
      ...validSource,
      NODE_ENV: "production",
      SESSION_SECRET: "x".repeat(40),
      MAIL_PROVIDER: "brevo",
      MAIL_API_KEY: "khoa-thu-nghiem",
      MAIL_FROM: "no-reply@example.com",
      TRUSTED_PROXY: "1",
      MAIL_DAILY_LIMIT: "250",
    });

    expect(env.MAIL_PROVIDER).toBe("brevo");
    expect(env.TRUSTED_PROXY).toBe(1);
    expect(env.MAIL_DAILY_LIMIT).toBe(250);
    expect(env.SESSION_SECRET).toBe("x".repeat(40));
  });

  it("từ chối SESSION_SECRET ngắn hơn 32 ký tự", () => {
    expect(() => loadEnv({ ...validSource, SESSION_SECRET: "ngan" })).toThrow(
      /SESSION_SECRET: phải dài ít nhất 32 ký tự/,
    );
  });
});

describe("biến quản trị", () => {
  it("chấp nhận khi không đặt tài khoản quản trị đầu tiên", () => {
    const env = loadEnv({ ...validSource });
    expect(env.ADMIN_BOOTSTRAP_EMAIL).toBeUndefined();
    expect(env.ADMIN_NOTIFY_EMAIL).toBeUndefined();
  });

  it("từ chối khi chỉ đặt email hoặc chỉ đặt mật khẩu", () => {
    expect(() => loadEnv({ ...validSource, ADMIN_BOOTSTRAP_EMAIL: "a@example.com" })).toThrow(
      /phải được đặt cùng nhau/,
    );
    expect(() =>
      loadEnv({ ...validSource, ADMIN_BOOTSTRAP_PASSWORD: "mat-khau-rat-dai-123" }),
    ).toThrow(/phải được đặt cùng nhau/);
  });

  it("từ chối mật khẩu ngắn hơn 12 ký tự", () => {
    expect(() =>
      loadEnv({
        ...validSource,
        ADMIN_BOOTSTRAP_EMAIL: "a@example.com",
        ADMIN_BOOTSTRAP_PASSWORD: "ngan",
      }),
    ).toThrow(/ADMIN_BOOTSTRAP_PASSWORD/);
  });

  it("nhận đủ cặp email và mật khẩu", () => {
    const env = loadEnv({
      ...validSource,
      ADMIN_BOOTSTRAP_EMAIL: "a@example.com",
      ADMIN_BOOTSTRAP_PASSWORD: "mat-khau-rat-dai-123",
      ADMIN_NOTIFY_EMAIL: "ops@example.com",
      PUBLIC_BASE_URL: "https://esg.example.com",
    });
    expect(env.ADMIN_BOOTSTRAP_EMAIL).toBe("a@example.com");
    expect(env.PUBLIC_BASE_URL).toBe("https://esg.example.com");
  });
});
