import {
  REPORT_ARCHIVE_LIMITS,
  hasReportFileSignature,
  reportChunkFieldsSchema,
} from "@esg/shared";
import { NextResponse } from "next/server";

import { msg } from "@/features/locale/lib/translate";
import {
  clientKey,
  hasDayCapacity,
  hasIpCapacity,
  recordUse,
} from "@/server/brand-theme/limits";
import {
  ReportInputError,
  forwardReportChunk,
  reportErrorResponse,
  reportFail,
} from "@/server/reports/archive";
import {
  REPORT_CHUNK_DAILY_LIMIT,
  REPORT_CHUNK_IP_LIMIT,
  reportChunkWindow,
} from "@/server/reports/limits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_BODY_BYTES = REPORT_ARCHIVE_LIMITS.chunkBytes + 200_000;

export async function POST(request: Request) {
  const window = reportChunkWindow();
  const key = clientKey(request);
  if (
    !hasIpCapacity(window, key, REPORT_CHUNK_IP_LIMIT) ||
    !hasDayCapacity(window, REPORT_CHUNK_DAILY_LIMIT)
  ) {
    return reportFail(429, msg("Bạn thao tác quá nhanh. Vui lòng thử lại sau ít phút."));
  }

  const declared = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) {
    return reportFail(413, msg("Dữ liệu gửi lên quá lớn."));
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return reportFail(400, msg("Dữ liệu gửi lên không hợp lệ."));
  }

  const fields = reportChunkFieldsSchema.safeParse({
    uploadId: form.get("uploadId"),
    format: form.get("format"),
    index: form.get("index"),
    total: form.get("total"),
  });
  const chunk = form.get("chunk");
  if (!fields.success || !(chunk instanceof File) || fields.data.index >= fields.data.total) {
    return reportFail(400, msg("Dữ liệu gửi lên không hợp lệ."));
  }
  const { uploadId, format, index, total } = fields.data;
  const isLast = index === total - 1;
  const limit = REPORT_ARCHIVE_LIMITS.chunkBytes;
  if (chunk.size === 0 || chunk.size > limit || (!isLast && chunk.size !== limit)) {
    return reportFail(400, msg("Dữ liệu gửi lên không hợp lệ."));
  }

  try {
    const bytes = new Uint8Array(await chunk.arrayBuffer());
    if (index === 0 && !hasReportFileSignature(bytes, format)) {
      throw new ReportInputError(msg("Tệp báo cáo không đúng định dạng."));
    }
    recordUse(window, key);
    await forwardReportChunk({ uploadId, format, index, bytes });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return reportErrorResponse(error);
  }
}
