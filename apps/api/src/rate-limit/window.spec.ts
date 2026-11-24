import { describe, expect, it } from "vitest";

import { secondsUntil, windowBounds } from "./window.js";

describe("windowBounds", () => {
  it("căn cửa sổ 10 phút theo mốc epoch", () => {
    const { start, end } = windowBounds(new Date("2026-11-24T10:07:30.000Z"), 600);

    expect(start.toISOString()).toBe("2026-11-24T10:00:00.000Z");
    expect(end.toISOString()).toBe("2026-11-24T10:10:00.000Z");
  });

  it("cửa sổ ngày bắt đầu 00:00 UTC", () => {
    const { start, end } = windowBounds(new Date("2026-11-24T23:59:59.000Z"), 86_400);

    expect(start.toISOString()).toBe("2026-11-24T00:00:00.000Z");
    expect(end.toISOString()).toBe("2026-11-25T00:00:00.000Z");
  });
});

describe("secondsUntil", () => {
  it("làm tròn lên và tối thiểu 1 giây", () => {
    const now = new Date("2026-11-24T10:00:00.000Z");

    expect(secondsUntil(new Date("2026-11-24T10:00:01.200Z"), now)).toBe(2);
    expect(secondsUntil(new Date("2026-11-24T09:59:00.000Z"), now)).toBe(1);
  });
});
