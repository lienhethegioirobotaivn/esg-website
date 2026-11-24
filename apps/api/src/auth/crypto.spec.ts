import { describe, expect, it } from "vitest";

import { generateOtpCode, hmacHex, newSessionToken, safeEqualHex, sha256Hex } from "./crypto.js";

describe("generateOtpCode", () => {
  it("luôn có đúng 6 chữ số, kể cả khi bắt đầu bằng 0", () => {
    for (let index = 0; index < 500; index += 1) {
      expect(generateOtpCode(6)).toMatch(/^\d{6}$/);
    }
  });
});

describe("hash", () => {
  it("HMAC phụ thuộc khóa bí mật", () => {
    expect(hmacHex("a".repeat(32), "123456")).not.toBe(hmacHex("b".repeat(32), "123456"));
    expect(hmacHex("a".repeat(32), "123456")).toBe(hmacHex("a".repeat(32), "123456"));
  });

  it("sha256 cho kết quả cố định 64 ký tự hex", () => {
    expect(sha256Hex("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });
});

describe("newSessionToken", () => {
  it("đủ dài, ngẫu nhiên và an toàn để đặt trong cookie", () => {
    const first = newSessionToken();

    expect(first).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(newSessionToken()).not.toBe(first);
  });
});

describe("safeEqualHex", () => {
  it("so sánh đúng và không lỗi khi khác độ dài", () => {
    expect(safeEqualHex("abcd", "abcd")).toBe(true);
    expect(safeEqualHex("abcd", "abce")).toBe(false);
    expect(safeEqualHex("abcd", "abc")).toBe(false);
  });
});
