import { describe, expect, it } from "vitest";

import { planLayout, type LayoutItem } from "./bank-layout.js";

function items(groups: (string | null)[]): LayoutItem[] {
  return groups.map((groupCode, index) => ({
    key: `q${index + 1}`,
    source: "COMMON",
    groupCode,
    topic: `T${index + 1}`,
  }));
}

function codes(input: (string | null)[]): string[] {
  const layout = planLayout(items(input));
  return input.map((_, index) => layout.placements.get(`q${index + 1}`)?.groupCode ?? "");
}

const full = (code: string): string[] => Array.from({ length: 5 }, () => code);

describe("xếp nhóm lưu", () => {
  it("giữ nguyên nhóm khi các nhóm đã liền nhau", () => {
    const input = [...full("C-G01"), "C-G02", "C-G02"];
    expect(codes(input)).toEqual(input);
  });

  it("câu mới vào nhóm đứng trước nếu còn chỗ", () => {
    expect(codes(["C-G01", "C-G01", null])).toEqual(["C-G01", "C-G01", "C-G01"]);
  });

  it("câu mới ở cuối nhóm đầy thì mở nhóm mới", () => {
    expect(codes([...full("C-G01"), null])).toEqual([...full("C-G01"), "C-G02"]);
  });

  it("câu mới giữa hai nhóm thì vào nhóm sau nếu nhóm sau còn chỗ", () => {
    expect(codes([...full("C-G01"), null, "C-G02"])).toEqual([...full("C-G01"), "C-G02", "C-G02"]);
  });

  it("chèn đầu danh sách thì vào nhóm đầu nếu còn chỗ", () => {
    expect(codes([null, "C-G01"])).toEqual(["C-G01", "C-G01"]);
  });

  it("chèn vào giữa nhóm đầy thì tách phần còn lại sang nhóm mới", () => {
    const result = codes(["C-G01", "C-G01", null, "C-G01", "C-G01", "C-G01"]);
    expect(result).toEqual(["C-G01", "C-G01", "C-G01", "C-G01", "C-G01", "C-G02"]);
  });

  it("không nhóm nào vượt 5 câu và mỗi nhóm luôn liền mạch sau khi đảo thứ tự", () => {
    const result = codes(["C-G01", "C-G02", "C-G01", "C-G02", ...full("C-G03"), "C-G01"]);
    const sizes = new Map<string, number>();
    const closed = new Set<string>();
    result.forEach((code, index) => {
      sizes.set(code, (sizes.get(code) ?? 0) + 1);
      expect(closed.has(code)).toBe(false);
      if (result[index + 1] !== code) {
        closed.add(code);
      }
    });
    expect(Math.max(...sizes.values())).toBeLessThanOrEqual(5);
  });

  it("đánh số thứ tự liên tục theo từng tab và ghép tiêu đề nhóm từ chủ đề", () => {
    const layout = planLayout([
      { key: "a", source: "MAN", groupCode: "MAN-G01", topic: "Nước" },
      { key: "b", source: "COMMON", groupCode: "C-G01", topic: "Điện" },
      { key: "c", source: "COMMON", groupCode: "C-G01", topic: "Điện" },
    ]);
    expect(layout.placements.get("a")?.position).toBe(1);
    expect(layout.placements.get("c")?.position).toBe(2);
    expect(layout.groups.map((group) => [group.code, group.title, group.track, group.position])).toEqual([
      ["C-G01", "Điện", "core", 1],
      ["MAN-G01", "Nước", "sector", 2],
    ]);
  });
});
