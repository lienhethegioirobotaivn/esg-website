import { describe, expect, it } from "vitest";

import { formatPublishDate, parsePublishDate } from "./publish-date.js";

describe("ngày đăng bài", () => {
  it("hiểu ngày theo giờ Việt Nam", () => {
    expect(parsePublishDate("2026-11-01")?.toISOString()).toBe("2026-10-31T17:00:00.000Z");
  });

  it("đổi qua đổi lại không lệch ngày", () => {
    for (const value of ["2026-01-01", "2026-02-28", "2028-02-29", "2026-12-31"]) {
      expect(formatPublishDate(parsePublishDate(value) as Date)).toBe(value);
    }
    expect(formatPublishDate(new Date("2026-03-04T18:30:00.000Z"))).toBe("2026-03-05");
  });

  it("từ chối ngày không tồn tại", () => {
    expect(parsePublishDate("2026-02-30")).toBeNull();
    expect(parsePublishDate("2026-13-01")).toBeNull();
    expect(parsePublishDate("hôm nay")).toBeNull();
  });
});
