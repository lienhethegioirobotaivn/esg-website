import { describe, expect, it } from "vitest";

import { otpReserve, retryDelaySeconds } from "./retry-policy.js";

describe("retryDelaySeconds", () => {
  it("giãn cách tăng dần rồi giữ ở 1 giờ", () => {
    expect([1, 2, 3, 4, 5, 9].map(retryDelaySeconds)).toEqual([30, 120, 600, 3600, 3600, 3600]);
  });
});

describe("otpReserve", () => {
  it("dành 20% hạn mức ngày cho OTP", () => {
    expect(otpReserve(300)).toBe(60);
    expect(otpReserve(100)).toBe(20);
    expect(otpReserve(7)).toBe(2);
  });
});
