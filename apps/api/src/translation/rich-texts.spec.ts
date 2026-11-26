import { describe, expect, it } from "vitest";

import { applyRichTexts, collectRichTexts } from "./rich-texts.js";

const doc = {
  type: "doc",
  content: [
    { type: "paragraph", content: [{ type: "text", text: "  Xin chào " }, { type: "hardBreak" }] },
    { type: "image", attrs: { src: "https://example.com/a.png", alt: "Ảnh", caption: " " } },
  ],
};

describe("chữ trong nội dung bài", () => {
  it("lấy chữ đã cắt khoảng trắng và mô tả ảnh", () => {
    expect(collectRichTexts(doc)).toEqual(["Xin chào", "Ảnh"]);
  });

  it("thay chữ mà giữ khoảng trắng, cấu trúc và không sửa bản gốc", () => {
    const result = applyRichTexts(doc, new Map([["Xin chào", "Hello"], ["Ảnh", "Photo"]]));
    expect(result.content[0]).toEqual({
      type: "paragraph",
      content: [{ type: "text", text: "  Hello " }, { type: "hardBreak" }],
    });
    expect(result.content[1]).toMatchObject({ attrs: { alt: "Photo", caption: " " } });
    expect(JSON.stringify(doc)).toContain("Xin chào");
  });
});
