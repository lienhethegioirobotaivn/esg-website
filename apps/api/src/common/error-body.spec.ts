import { BadRequestException, NotFoundException } from "@nestjs/common";
import { describe, expect, it } from "vitest";

import { AppError } from "./app-error.js";
import { toErrorResult } from "./error-body.js";

describe("toErrorResult", () => {
  it("giữ nguyên mã, thông điệp và trường phụ của AppError", () => {
    const result = toErrorResult(
      new AppError(400, "otp_invalid", "Mã chưa đúng.", { triesLeft: 3 }),
    );

    expect(result.status).toBe(400);
    expect(result.body).toEqual({
      error: { code: "otp_invalid", message: "Mã chưa đúng.", triesLeft: 3 },
    });
    expect(result.retryAfter).toBeNull();
  });

  it("trả retryAfter để đặt tiêu đề Retry-After", () => {
    const result = toErrorResult(new AppError(429, "otp_wait", "Chờ.", { retryAfter: 42 }));

    expect(result.retryAfter).toBe(42);
    expect(result.body.error["retryAfter"]).toBe(42);
  });

  it("đổi HttpException của Nest sang mã ổn định", () => {
    expect(toErrorResult(new NotFoundException()).body.error.code).toBe("not_found");
    expect(toErrorResult(new BadRequestException("x")).body.error.code).toBe("invalid_request");
  });

  it("nhận lỗi của body-parser có trường status", () => {
    const result = toErrorResult(Object.assign(new Error("Unexpected token"), { status: 400 }));

    expect(result.status).toBe(400);
    expect(result.body.error.code).toBe("invalid_request");
  });

  it("nhận lỗi quá lớn 413", () => {
    const result = toErrorResult(Object.assign(new Error("too large"), { statusCode: 413 }));

    expect(result.status).toBe(413);
    expect(result.body.error.code).toBe("payload_too_large");
  });

  it("che lỗi không lường trước bằng 500 chung, không lộ chi tiết", () => {
    const result = toErrorResult(new Error("password authentication failed for user esg"));

    expect(result.status).toBe(500);
    expect(result.body.error.code).toBe("internal_error");
    expect(JSON.stringify(result.body)).not.toContain("password");
  });
});
