import { sanitizeRichDoc } from "@esg/shared/node";
import { describe, expect, it } from "vitest";

import { collectPostImageRefs } from "./post-image-refs.js";

const FIRST = "0192f3a0-1111-7000-8000-000000000001";
const SECOND = "0192f3a0-2222-7000-8000-000000000002";

function image(src: string) {
  return { type: "image", attrs: { src, alt: "", caption: "", align: "center", width: 100 } };
}

describe("ảnh được bài viết sử dụng", () => {
  it("gom ảnh bìa và ảnh trong bài, kể cả trong danh sách và bảng, không trùng", () => {
    const body = sanitizeRichDoc({
      type: "doc",
      content: [
        image(`/api/v1/files/${FIRST}`),
        { type: "bulletList", content: [{ type: "listItem", content: [image(`/api/v1/files/${SECOND}`)] }] },
        {
          type: "table",
          content: [
            { type: "tableRow", content: [{ type: "tableCell", content: [image(`/api/v1/files/${SECOND}`)] }] },
          ],
        },
      ],
    });

    expect(collectPostImageRefs(`/api/v1/files/${FIRST}`, body)).toEqual([
      { fileId: FIRST, field: "coverUrl" },
      { fileId: SECOND, field: "body" },
    ]);
  });

  it("bỏ qua ảnh ngoài hệ thống", () => {
    const body = sanitizeRichDoc({ type: "doc", content: [image("https://example.com/a.png")] });
    expect(collectPostImageRefs("https://example.com/bia.png", body)).toEqual([]);
    expect(collectPostImageRefs("", body)).toEqual([]);
  });
});
