import { describe, expect, it } from "vitest";

import { hashPassword, verifyPassword } from "./password.js";

describe("password", () => {
  it("băm có muối nên cùng mật khẩu cho hai chuỗi khác nhau, vẫn xác minh đúng", async () => {
    const first = await hashPassword("mat-khau-rat-dai-123");
    const second = await hashPassword("mat-khau-rat-dai-123");

    expect(first).not.toBe(second);
    expect(first.startsWith("scrypt$16384$8$1$")).toBe(true);
    expect(await verifyPassword("mat-khau-rat-dai-123", first)).toBe(true);
    expect(await verifyPassword("mat-khau-rat-dai-124", first)).toBe(false);
  });

  it("từ chối chuỗi băm sai định dạng", async () => {
    expect(await verifyPassword("x", "")).toBe(false);
    expect(await verifyPassword("x", "bcrypt$1$2$3$a$b")).toBe(false);
    expect(await verifyPassword("x", "scrypt$0$8$1$YQ==$YQ==")).toBe(false);
    expect(await verifyPassword("x", "scrypt$16384$8$1$YQ==$YQ==")).toBe(false);
  });

  it("coi các dạng Unicode tương đương là cùng một mật khẩu", async () => {
    const hash = await hashPassword("Mật-khẩu-đủ-dài-1");
    expect(await verifyPassword("Mật-khẩu-đủ-dài-1".normalize("NFD"), hash)).toBe(true);
  });
});
