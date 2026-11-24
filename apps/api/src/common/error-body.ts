import { HttpException } from "@nestjs/common";

import { AppError } from "./app-error.js";

export interface ErrorBody {
  error: { code: string; message: string } & Record<string, number | string>;
}

export interface ErrorResult {
  status: number;
  body: ErrorBody;
  retryAfter: number | null;
}

const CODE_BY_STATUS: Readonly<Record<number, { code: string; message: string }>> = {
  400: { code: "invalid_request", message: "Dữ liệu gửi lên không hợp lệ." },
  401: { code: "unauthorized", message: "Bạn cần xác nhận email để tiếp tục." },
  403: { code: "forbidden", message: "Bạn không có quyền thực hiện thao tác này." },
  404: { code: "not_found", message: "Không tìm thấy nội dung yêu cầu." },
  405: { code: "method_not_allowed", message: "Phương thức không được hỗ trợ." },
  413: { code: "payload_too_large", message: "Dữ liệu gửi lên quá lớn." },
  429: { code: "rate_limited", message: "Bạn thao tác quá nhanh. Vui lòng thử lại sau ít phút." },
};

const INTERNAL = {
  code: "internal_error",
  message: "Hệ thống đang gặp sự cố. Vui lòng thử lại sau.",
};

function readStatus(exception: unknown): number | null {
  if (typeof exception !== "object" || exception === null) {
    return null;
  }
  const record = exception as Record<string, unknown>;
  const value = record["status"] ?? record["statusCode"];
  return typeof value === "number" && value >= 400 && value < 600 ? value : null;
}

export function toErrorResult(exception: unknown): ErrorResult {
  if (exception instanceof AppError) {
    const retryAfter = exception.extra["retryAfter"];
    return {
      status: exception.status,
      body: { error: { code: exception.code, message: exception.message, ...exception.extra } },
      retryAfter: retryAfter ?? null,
    };
  }

  const status = exception instanceof HttpException ? exception.getStatus() : readStatus(exception);
  if (status !== null && status < 500) {
    const known = CODE_BY_STATUS[status] ?? CODE_BY_STATUS[400];
    if (known) {
      return { status, body: { error: { ...known } }, retryAfter: null };
    }
  }

  return { status: 500, body: { error: { ...INTERNAL } }, retryAfter: null };
}
