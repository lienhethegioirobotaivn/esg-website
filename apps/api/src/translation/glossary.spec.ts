import { createHash } from "node:crypto";

import { describe, expect, it } from "vitest";

import {
  exactTranslation,
  isValidTranslation,
  keepTermsIn,
  loadGlossary,
  termMappingsIn,
} from "./glossary.js";
import { hashText, uniqueTranslatable } from "./hash.js";

const glossary = loadGlossary();

describe("mã băm câu nguồn", () => {
  it("là 16 ký tự đầu của sha256 sau khi chuẩn hóa NFC", () => {
    const text = "Môi trường";
    const expected = createHash("sha256").update(text.normalize("NFC")).digest("hex").slice(0, 16);
    expect(hashText(text)).toBe(expected);
    expect(hashText(text.normalize("NFD"))).toBe(expected);
  });

  it("chỉ giữ câu có chữ và không trùng", () => {
    expect(uniqueTranslatable(["120+", "", "Năm", "Năm", "—"])).toEqual(["Năm"]);
  });
});

describe("bảng thuật ngữ", () => {
  it("dịch cố định theo đúng câu", () => {
    expect(exactTranslation(glossary, "Môi trường", "en")).toBe("Environmental");
    expect(exactTranslation(glossary, "môi trường", "en")).toBeNull();
    expect(exactTranslation(glossary, "constructor", "en")).toBeNull();
  });

  it("nhận ra từ cần giữ nguyên theo ranh giới từ", () => {
    expect(keepTermsIn(glossary, "Báo cáo ESG về Scope 1 và CO2e")).toEqual(["ESG", "Scope 1", "CO2e"]);
    expect(keepTermsIn(glossary, "Nội dung ESGX")).toEqual([]);
  });

  it("chỉ gửi kèm thuật ngữ có trong lô", () => {
    expect(termMappingsIn(glossary, ["Phát thải khí nhà kính"], "en")).toEqual([
      { source: "khí nhà kính", target: "greenhouse gas" },
    ]);
  });

  it("loại bản dịch rỗng, mất biến, mất từ giữ nguyên hoặc dài bất thường", () => {
    const source = "Chào {name}, báo cáo ESG đã sẵn sàng";
    expect(isValidTranslation(glossary, source, "Hello {name}, your ESG report is ready")).toBe(true);
    expect(isValidTranslation(glossary, source, "你好 {name}，ESG报告已就绪")).toBe(true);
    expect(isValidTranslation(glossary, source, "   ")).toBe(false);
    expect(isValidTranslation(glossary, source, "Hello {ten}, your ESG report is ready")).toBe(false);
    expect(isValidTranslation(glossary, source, "Hello {name}, your report is ready")).toBe(false);
    expect(isValidTranslation(glossary, "Có", "x".repeat(500))).toBe(false);
  });
});
