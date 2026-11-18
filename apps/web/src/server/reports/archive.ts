import "server-only";
import { msg } from "@/features/locale/lib/translate";

import { reportSnapshotSchema } from "@esg/shared";
import type { ReportArchiveFormat, ReportFinishInput } from "@esg/shared";
import { NextResponse } from "next/server";

import { CompanyBridgeError } from "../company/save-company";
import { callAbout } from "../about/bridge";

const FINISH_TIMEOUT_MS = 55_000;

export class ReportInputError extends Error {
  readonly status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "ReportInputError";
    this.status = status;
  }
}

export function reportFail(status: number, message: string) {
  return NextResponse.json({ error: { message } }, { status });
}

export function reportErrorResponse(error: unknown) {
  if (error instanceof ReportInputError) {
    return reportFail(error.status, error.message);
  }
  if (error instanceof CompanyBridgeError) {
    console.error(error.message);
    return error.kind === "not-configured"
      ? reportFail(503, msg("Chưa cấu hình kết nối lưu dữ liệu vào Google Sheet."))
      : reportFail(502, msg("Không lưu được báo cáo. Vui lòng thử lại sau."));
  }
  console.error(error);
  return reportFail(500, msg("Không lưu được báo cáo. Vui lòng thử lại sau."));
}

export async function forwardReportChunk(input: {
  uploadId: string;
  format: ReportArchiveFormat;
  index: number;
  bytes: Uint8Array;
}): Promise<void> {
  await callAbout("uploadReportChunk", {
    uploadId: input.uploadId,
    format: input.format,
    index: input.index,
    data: Buffer.from(input.bytes).toString("base64"),
  });
}

export function assertValidSnapshot(snapshot: string): void {
  let parsed: unknown;
  try {
    parsed = JSON.parse(snapshot);
  } catch {
    throw new ReportInputError(msg("Dữ liệu gửi lên không hợp lệ."));
  }
  if (!reportSnapshotSchema.safeParse(parsed).success) {
    throw new ReportInputError(msg("Dữ liệu gửi lên không hợp lệ."));
  }
}

export async function finishReportUpload(
  input: ReportFinishInput,
  ownerEmail: string | null = null,
): Promise<{ exportId: string }> {
  assertValidSnapshot(input.snapshot);
  const result = await callAbout(
    "finishReport",
    ownerEmail === null ? { ...input } : { ...input, email: ownerEmail },
    FINISH_TIMEOUT_MS,
  );
  const exportId = result["exportId"];
  if (typeof exportId !== "string") {
    throw new CompanyBridgeError(
      "Apps Script không trả mã lần xuất.",
      "failed",
    );
  }
  return { exportId };
}
