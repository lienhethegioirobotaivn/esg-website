import "server-only";

import type {
  EmailOtpRequestInput,
  EmailOtpVerifyInput,
} from "@esg/shared";
import { NextResponse } from "next/server";

import { msg } from "@/features/locale/lib/translate";

import { callAbout } from "../about/bridge";
import { CompanyBridgeError } from "../company/save-company";

import { buildOtpMail } from "./otp-mail";

export class AuthError extends Error {
  readonly status: number;
  readonly extra: Record<string, number>;

  constructor(message: string, status: number, extra: Record<string, number> = {}) {
    super(message);
    this.name = "AuthError";
    this.status = status;
    this.extra = extra;
  }
}

export function authFail(
  status: number,
  message: string,
  extra: Record<string, number> = {},
) {
  return NextResponse.json({ error: { message, ...extra } }, { status });
}

export function authErrorResponse(error: unknown) {
  if (error instanceof AuthError) {
    return authFail(error.status, error.message, error.extra);
  }
  if (error instanceof CompanyBridgeError) {
    console.error(error.message);
    return error.kind === "not-configured"
      ? authFail(503, msg("Chưa cấu hình kết nối gửi email xác nhận."))
      : authFail(502, msg("Chưa gửi được mã xác nhận. Vui lòng thử lại sau."));
  }
  console.error(error);
  return authFail(500, msg("Chưa gửi được mã xác nhận. Vui lòng thử lại sau."));
}

function readStatus(result: Record<string, unknown>): string {
  const status = result["status"];
  if (typeof status !== "string") {
    throw new CompanyBridgeError("Apps Script không trả trạng thái.", "failed");
  }
  return status;
}

function readNumber(result: Record<string, unknown>, key: string, fallback: number): number {
  const value = result[key];
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export interface OtpRequestResult {
  readonly resendAfter: number;
  readonly expiresIn: number;
}

export async function requestEmailOtp(
  input: EmailOtpRequestInput,
): Promise<OtpRequestResult> {
  const mail = buildOtpMail(input.locale);
  const result = await callAbout("otpRequest", {
    email: input.email,
    subject: mail.subject,
    text: mail.text,
  });
  const status = readStatus(result);
  if (status === "sent") {
    return {
      resendAfter: readNumber(result, "resendAfter", 60),
      expiresIn: readNumber(result, "expiresIn", 600),
    };
  }
  if (status === "wait") {
    throw new AuthError(
      msg("Bạn vừa yêu cầu mã. Vui lòng chờ một lát rồi gửi lại."),
      429,
      { retryAfter: readNumber(result, "retryAfter", 60) },
    );
  }
  if (status === "hourly-limit") {
    throw new AuthError(
      msg("Email này đã yêu cầu mã quá nhiều lần. Vui lòng thử lại sau."),
      429,
      { retryAfter: readNumber(result, "retryAfter", 3600) },
    );
  }
  if (status === "daily-limit") {
    throw new AuthError(
      msg("Hệ thống tạm thời chưa gửi thêm được mã xác nhận. Vui lòng thử lại vào ngày mai."),
      503,
    );
  }
  throw new CompanyBridgeError("Apps Script trả trạng thái không hợp lệ.", "failed");
}

export async function verifyEmailOtp(input: EmailOtpVerifyInput): Promise<void> {
  const result = await callAbout("otpVerify", {
    email: input.email,
    code: input.code,
  });
  const status = readStatus(result);
  if (status === "verified") {
    return;
  }
  if (status === "invalid") {
    throw new AuthError(msg("Mã chưa đúng. Vui lòng kiểm tra lại."), 400, {
      triesLeft: readNumber(result, "triesLeft", 0),
    });
  }
  if (status === "expired") {
    throw new AuthError(msg("Mã đã hết hạn. Vui lòng gửi mã mới."), 410);
  }
  if (status === "locked") {
    throw new AuthError(
      msg("Bạn đã nhập sai quá nhiều lần. Vui lòng gửi mã mới."),
      429,
    );
  }
  throw new CompanyBridgeError("Apps Script trả trạng thái không hợp lệ.", "failed");
}

export type AttachResult = "attached" | "already";

export async function attachReportOwner(input: {
  exportId: string;
  email: string;
}): Promise<AttachResult> {
  const result = await callAbout("setReportOwner", input);
  const status = readStatus(result);
  if (status === "attached" || status === "already") {
    return status;
  }
  if (status === "conflict") {
    throw new AuthError(
      msg("Báo cáo này đã được liên kết với một email khác."),
      409,
    );
  }
  if (status === "missing") {
    throw new AuthError(msg("Không tìm thấy báo cáo cần liên kết."), 404);
  }
  throw new CompanyBridgeError("Apps Script trả trạng thái không hợp lệ.", "failed");
}
