import { reportAttachSchema } from "@esg/shared";
import { NextResponse } from "next/server";

import { msg } from "@/features/locale/lib/translate";
import {
  clientKey,
  hasDayCapacity,
  hasIpCapacity,
  recordUse,
} from "@/server/brand-theme/limits";
import {
  attachReportOwner,
  authErrorResponse,
  authFail,
} from "@/server/auth/email-otp";
import {
  AUTH_ATTACH_DAILY_LIMIT,
  AUTH_ATTACH_IP_LIMIT,
  authAttachWindow,
} from "@/server/auth/limits";
import {
  checkAttachToken,
  readSessionEmail,
} from "@/server/auth/user-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 4_000;

export async function POST(request: Request) {
  const window = authAttachWindow();
  const key = clientKey(request);
  if (
    !hasIpCapacity(window, key, AUTH_ATTACH_IP_LIMIT) ||
    !hasDayCapacity(window, AUTH_ATTACH_DAILY_LIMIT)
  ) {
    return authFail(429, msg("Bạn thao tác quá nhanh. Vui lòng thử lại sau ít phút."));
  }
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) {
    return authFail(413, msg("Dữ liệu gửi lên quá lớn."));
  }
  const email = await readSessionEmail();
  if (email === null) {
    return authFail(401, msg("Bạn cần xác nhận email trước."));
  }
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return authFail(400, msg("Dữ liệu gửi lên không hợp lệ."));
  }
  const parsed = reportAttachSchema.safeParse(payload);
  if (!parsed.success) {
    return authFail(400, msg("Dữ liệu gửi lên không hợp lệ."));
  }
  if (!checkAttachToken(parsed.data.attachToken, parsed.data.exportId)) {
    return authFail(403, msg("Không được phép liên kết báo cáo này."));
  }
  try {
    recordUse(window, key);
    const status = await attachReportOwner({
      exportId: parsed.data.exportId,
      email,
    });
    return NextResponse.json({ status });
  } catch (error) {
    return authErrorResponse(error);
  }
}
