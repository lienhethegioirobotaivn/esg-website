import { describe, expect, it } from "vitest";

import { signToken, TOKEN_TTL_MS, verifyToken } from "./signed-token.js";

const secret = "s".repeat(40);

describe("signToken", () => {
  it("chấp nhận token đúng mục đích, đối tượng và còn hạn", () => {
    const token = signToken(secret, "attach", "RX-20260101-ABC123", 1_000);
    expect(verifyToken(secret, "attach", "RX-20260101-ABC123", token, 2_000)).toBe(true);
  });

  it("từ chối khi sai đối tượng, sai mục đích, sai khóa hoặc bị sửa", () => {
    const token = signToken(secret, "attach", "RX-1", 1_000);
    expect(verifyToken(secret, "attach", "RX-2", token, 2_000)).toBe(false);
    expect(verifyToken(secret, "claim", "RX-1", token, 2_000)).toBe(false);
    expect(verifyToken("x".repeat(40), "attach", "RX-1", token, 2_000)).toBe(false);
    expect(verifyToken(secret, "attach", "RX-1", `${token}0`, 2_000)).toBe(false);
    expect(verifyToken(secret, "attach", "RX-1", "rác", 2_000)).toBe(false);
  });

  it("từ chối khi hết hạn hoặc phát hành từ tương lai", () => {
    const token = signToken(secret, "attach", "RX-1", 1_000);
    expect(verifyToken(secret, "attach", "RX-1", token, 1_000 + TOKEN_TTL_MS.attach)).toBe(true);
    expect(verifyToken(secret, "attach", "RX-1", token, 1_001 + TOKEN_TTL_MS.attach)).toBe(false);
    const future = signToken(secret, "attach", "RX-1", 10_000_000);
    expect(verifyToken(secret, "attach", "RX-1", future, 1_000)).toBe(false);
  });
});
