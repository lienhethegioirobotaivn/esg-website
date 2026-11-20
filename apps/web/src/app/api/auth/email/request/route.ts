import { emailOtpRequestSchema } from "@esg/shared";
import { NextResponse } from "next/server";

import { msg } from "@/features/locale/lib/translate";
import {
  clientKey,
  hasDayCapacity,
  hasIpCapacity,
  recordUse,
} from "@/server/brand-theme/limits";
import {
  authErrorResponse,
  authFail,
  requestEmailOtp,
} from "@/server/auth/email-otp";
import {
  AUTH_REQUEST_DAILY_LIMIT,
  AUTH_REQUEST_IP_LIMIT,
  authRequestWindow,
} from "@/server/auth/limits";
import { isUserSessionConfigured } from "@/server/auth/user-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 4_000;

export async function POST(request: Request) {
  if (!isUserSessionConfigured()) {
    return authFail(503, msg("Tính năng xác nhận email chưa được bật."));
  }
  const window = authRequestWindow();
  const key = clientKey(request);
  if (
    !hasIpCapacity(window, key, AUTH_REQUEST_IP_LIMIT) ||
    !hasDayCapacity(window, AUTH_REQUEST_DAILY_LIMIT)
  ) {
    return authFail(429, msg("Bạn thao tác quá nhanh. Vui lòng thử lại sau ít phút."));
  }
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) {
    return authFail(413, msg("Dữ liệu gửi lên quá lớn."));
  }
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return authFail(400, msg("Dữ liệu gửi lên không hợp lệ."));
  }
  const parsed = emailOtpRequestSchema.safeParse(payload);
  if (!parsed.success) {
    return authFail(400, msg("Email chưa hợp lệ. Vui lòng kiểm tra lại."));
  }
  try {
    recordUse(window, key);
    const result = await requestEmailOtp(parsed.data);
    return NextResponse.json(result);
  } catch (error) {
    return authErrorResponse(error);
  }
}
