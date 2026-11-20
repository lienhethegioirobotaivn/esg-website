import { reportFinishSchema } from "@esg/shared";
import { NextResponse } from "next/server";

import { msg } from "@/features/locale/lib/translate";
import {
  clientKey,
  hasDayCapacity,
  hasIpCapacity,
  recordUse,
} from "@/server/brand-theme/limits";
import { issueAttachToken, readSessionEmail } from "@/server/auth/user-session";
import {
  finishReportUpload,
  reportErrorResponse,
  reportFail,
} from "@/server/reports/archive";
import {
  REPORT_FINISH_DAILY_LIMIT,
  REPORT_FINISH_IP_LIMIT,
  reportFinishWindow,
} from "@/server/reports/limits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_BODY_BYTES = 2_000_000;

export async function POST(request: Request) {
  const window = reportFinishWindow();
  const key = clientKey(request);
  if (
    !hasIpCapacity(window, key, REPORT_FINISH_IP_LIMIT) ||
    !hasDayCapacity(window, REPORT_FINISH_DAILY_LIMIT)
  ) {
    return reportFail(429, msg("Bạn thao tác quá nhanh. Vui lòng thử lại sau ít phút."));
  }

  const declared = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) {
    return reportFail(413, msg("Dữ liệu gửi lên quá lớn."));
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return reportFail(400, msg("Dữ liệu gửi lên không hợp lệ."));
  }
  const parsed = reportFinishSchema.safeParse(payload);
  if (!parsed.success) {
    return reportFail(400, msg("Dữ liệu gửi lên không hợp lệ."));
  }

  try {
    recordUse(window, key);
    const email = await readSessionEmail();
    const result = await finishReportUpload(parsed.data, email);
    return NextResponse.json({
      exportId: result.exportId,
      attachToken: issueAttachToken(result.exportId),
      linked: email !== null,
    });
  } catch (error) {
    return reportErrorResponse(error);
  }
}
