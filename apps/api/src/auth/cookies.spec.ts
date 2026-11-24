import { describe, expect, it } from "vitest";

import { readCookie, sessionCookieOptions } from "./cookies.js";

describe("readCookie", () => {
  it("đọc đúng cookie trong chuỗi nhiều cookie", () => {
    expect(readCookie("a=1; esg-user=token-abc; b=2", "esg-user")).toBe("token-abc");
  });

  it("trả null khi thiếu header hoặc thiếu cookie", () => {
    expect(readCookie(undefined, "esg-user")).toBeNull();
    expect(readCookie("a=1", "esg-user")).toBeNull();
  });

  it("không khớp nhầm tên có chung hậu tố", () => {
    expect(readCookie("not-esg-user=x", "esg-user")).toBeNull();
  });

  it("trả null khi giá trị mã hóa hỏng", () => {
    expect(readCookie("esg-user=%E0%A4%A", "esg-user")).toBeNull();
  });
});

describe("sessionCookieOptions", () => {
  it("HttpOnly, SameSite=Lax, 30 ngày, Secure theo môi trường", () => {
    expect(sessionCookieOptions(true)).toMatchObject({
      httpOnly: true,
      sameSite: "lax",
      secure: true,
      path: "/",
      maxAge: 30 * 86_400_000,
    });
    expect(sessionCookieOptions(false).secure).toBe(false);
  });
});
