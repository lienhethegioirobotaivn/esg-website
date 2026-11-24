import { describe, expect, it } from "vitest";

import { MAIL_TEMPLATES, findTemplate } from "./mail-templates.js";

describe("mẫu thư otp", () => {
  it("chèn mã vào nội dung tiếng Việt", () => {
    const message = MAIL_TEMPLATES.otp.render({ code: "042913", locale: "vi" }, "a@example.com");

    expect(message.to).toBe("a@example.com");
    expect(message.subject).toBe("Mã xác nhận email - ESG Report Online");
    expect(message.text).toContain("Mã xác nhận của bạn là: 042913");
    expect(message.text).toContain("10 phút");
  });

  it("có đủ bốn ngôn ngữ", () => {
    for (const locale of ["vi", "en", "fr", "zh"] as const) {
      const message = MAIL_TEMPLATES.otp.render({ code: "123456", locale }, "a@example.com");
      expect(message.text).toContain("123456");
    }
  });

  it("từ chối payload thiếu mã hoặc sai định dạng", () => {
    expect(() => MAIL_TEMPLATES.otp.render({ locale: "vi" }, "a@example.com")).toThrow();
    expect(() =>
      MAIL_TEMPLATES.otp.render({ code: "12", locale: "vi" }, "a@example.com"),
    ).toThrow();
  });

  it("OTP chỉ thử một lần, ưu tiên cao và xóa mã khỏi payload sau khi gửi", () => {
    expect(MAIL_TEMPLATES.otp.maxAttempts).toBe(1);
    expect(MAIL_TEMPLATES.otp.priority).toBe("high");
    expect(MAIL_TEMPLATES.otp.scrubPayloadAfterSend).toBe(true);
  });

  it("findTemplate không nhận tên lạ hoặc tên thuộc tính của Object", () => {
    expect(findTemplate("otp")).toBeDefined();
    expect(findTemplate("khong-co")).toBeUndefined();
    expect(findTemplate("toString")).toBeUndefined();
  });
});
