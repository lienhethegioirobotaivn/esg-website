import { describe, expect, it } from "vitest";

import { detectFileType } from "./detect-file-type.js";
import { MIME_DOCX, MIME_JPEG, MIME_PDF, MIME_PNG, MIME_WEBP } from "./file-rules.js";

const bytes = (...values: number[]): Uint8Array => Uint8Array.from(values);

describe("detectFileType", () => {
  it("nhận PNG, JPEG, WEBP, PDF và DOCX theo chữ ký đầu tệp", () => {
    expect(detectFileType(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0))).toBe(MIME_PNG);
    expect(detectFileType(bytes(0xff, 0xd8, 0xff, 0xe0))).toBe(MIME_JPEG);
    expect(
      detectFileType(bytes(0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x45, 0x42, 0x50)),
    ).toBe(MIME_WEBP);
    expect(detectFileType(bytes(0x25, 0x50, 0x44, 0x46, 0x2d, 0x31))).toBe(MIME_PDF);
    expect(detectFileType(bytes(0x50, 0x4b, 0x03, 0x04, 0))).toBe(MIME_DOCX);
  });

  it("không nhận RIFF không phải WEBP, tệp rỗng hay nội dung lạ", () => {
    expect(
      detectFileType(bytes(0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x41, 0x56, 0x45)),
    ).toBeNull();
    expect(detectFileType(bytes())).toBeNull();
    expect(detectFileType(Buffer.from("<html></html>"))).toBeNull();
  });
});
