import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { postInputSchema } from "../src/about";
import { isPostImageUrl, postImageId, postImagePath } from "../src/post-image";
import { sanitizeRichDoc } from "../src/rich-text";

const ID = "0197a1b2-c3d4-7e5f-8a9b-0c1d2e3f4a5b";

function image(src: string) {
  return { type: "doc", content: [{ type: "image", attrs: { src } }] };
}

describe("đường dẫn ảnh bài viết", () => {
  it("nhận đường dẫn tệp của API và liên kết https", () => {
    assert.equal(postImagePath(ID), `/api/v1/files/${ID}`);
    assert.equal(postImageId(postImagePath(ID)), ID);
    assert.equal(isPostImageUrl(postImagePath(ID)), true);
    assert.equal(isPostImageUrl("https://lh3.googleusercontent.com/d/abc=w1600"), true);
    assert.equal(postImageId("https://example.com/api/v1/files/x"), null);
  });

  it("từ chối đường dẫn khác", () => {
    for (const url of [
      "http://example.com/a.png",
      "/api/v1/files/abc",
      `/api/v1/files/${ID}/../x`,
      `//evil.example/api/v1/files/${ID}`,
      "javascript:alert(1)",
      "",
    ]) {
      assert.equal(isPostImageUrl(url), false, url);
    }
  });

  it("giữ ảnh của API trong nội dung và ảnh bìa", () => {
    assert.equal(sanitizeRichDoc(image(postImagePath(ID))).content.length, 1);
    assert.equal(sanitizeRichDoc(image("/etc/passwd")).content.length, 0);
    assert.equal(postInputSchema.shape.coverUrl.safeParse(postImagePath(ID)).success, true);
    assert.equal(postInputSchema.shape.coverUrl.safeParse("/khac").success, false);
  });
});
