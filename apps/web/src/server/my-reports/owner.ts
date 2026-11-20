import "server-only";

import {
  EXPORT_ID_PATTERN,
  myReportListSchema,
  reportSnapshotSchema,
} from "@esg/shared";
import type { MyReport, ReportArchiveFormat, ReportSnapshot } from "@esg/shared";
import { NextResponse } from "next/server";

import { msg } from "@/features/locale/lib/translate";

import { callAbout } from "../about/bridge";
import { CompanyBridgeError } from "../company/save-company";
import {
  clientKey,
  hasDayCapacity,
  hasIpCapacity,
  recordUse,
} from "../brand-theme/limits";
import type { RateWindow } from "../brand-theme/limits";
import { readSessionEmail } from "../auth/user-session";

const FILE_TIMEOUT_MS = 50_000;
const NO_STORE = { "Cache-Control": "private, no-store" } as const;

export class OwnerError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "OwnerError";
    this.status = status;
  }
}

export function ownerFail(status: number, message: string) {
  return NextResponse.json(
    { error: { message } },
    { status, headers: NO_STORE },
  );
}

export function ownerErrorResponse(error: unknown) {
  if (error instanceof OwnerError) {
    return ownerFail(error.status, error.message);
  }
  if (error instanceof CompanyBridgeError) {
    console.error(error.message);
    return error.kind === "not-configured"
      ? ownerFail(503, msg("Chưa cấu hình kết nối lưu dữ liệu vào Google Sheet."))
      : ownerFail(502, msg("Chưa tải được dữ liệu báo cáo. Vui lòng thử lại sau."));
  }
  console.error(error);
  return ownerFail(500, msg("Chưa tải được dữ liệu báo cáo. Vui lòng thử lại sau."));
}

export function ownerJson(body: unknown) {
  return NextResponse.json(body, { headers: NO_STORE });
}

export async function requireOwner(
  request: Request,
  window: RateWindow,
  ipLimit: number,
  dayLimit: number,
): Promise<{ email: string } | { response: NextResponse }> {
  const key = clientKey(request);
  if (!hasIpCapacity(window, key, ipLimit) || !hasDayCapacity(window, dayLimit)) {
    return {
      response: ownerFail(429, msg("Bạn thao tác quá nhanh. Vui lòng thử lại sau ít phút.")),
    };
  }
  const email = await readSessionEmail();
  if (email === null) {
    return {
      response: ownerFail(401, msg("Vui lòng xác nhận email để xem báo cáo của bạn.")),
    };
  }
  recordUse(window, key);
  return { email };
}

export function parseExportId(value: string): string {
  if (!EXPORT_ID_PATTERN.test(value)) {
    throw new OwnerError(msg("Không tìm thấy báo cáo."), 404);
  }
  return value;
}

function readString(result: Record<string, unknown>, key: string): string | null {
  const value = result[key];
  return typeof value === "string" ? value : null;
}

function readStatus(result: Record<string, unknown>): string {
  const status = readString(result, "status");
  if (status === null) {
    throw new CompanyBridgeError("Apps Script không trả trạng thái.", "failed");
  }
  return status;
}

export async function listOwnerReports(email: string): Promise<MyReport[]> {
  const result = await callAbout("listOwnerReports", { email });
  const parsed = myReportListSchema.safeParse(result);
  if (!parsed.success) {
    throw new CompanyBridgeError("Danh sách báo cáo không hợp lệ.", "failed");
  }
  return parsed.data.reports;
}

export async function fetchOwnerSnapshot(
  email: string,
  exportId: string,
): Promise<{ snapshot: ReportSnapshot; reportCode: string }> {
  const reports = await listOwnerReports(email);
  const report = reports.find((item) => item.exportId === exportId);
  if (!report) {
    throw new OwnerError(msg("Không tìm thấy báo cáo."), 404);
  }
  const result = await callAbout("getOwnerSnapshot", { email, exportId });
  if (readStatus(result) !== "ok") {
    throw new OwnerError(msg("Không tìm thấy dữ liệu của báo cáo này."), 404);
  }
  const text = readString(result, "snapshot");
  let raw: unknown = null;
  try {
    raw = text === null ? null : JSON.parse(text);
  } catch {
    raw = null;
  }
  const parsed = reportSnapshotSchema.safeParse(raw);
  if (!parsed.success) {
    throw new OwnerError(msg("Dữ liệu của báo cáo này không đọc được."), 422);
  }
  return { snapshot: parsed.data, reportCode: report.reportCode };
}

export async function removeOwnerReport(
  email: string,
  exportId: string,
): Promise<void> {
  const result = await callAbout("deleteOwnerReport", { email, exportId }, FILE_TIMEOUT_MS);
  const status = readStatus(result);
  if (status === "missing") {
    throw new OwnerError(msg("Không tìm thấy báo cáo."), 404);
  }
  if (status !== "deleted") {
    throw new CompanyBridgeError("Apps Script trả trạng thái không hợp lệ.", "failed");
  }
}

interface FileChunk {
  readonly bytes: Uint8Array;
  readonly total: number;
  readonly size: number;
  readonly name: string;
}

async function fetchFileChunk(
  email: string,
  exportId: string,
  format: ReportArchiveFormat,
  index: number,
): Promise<FileChunk> {
  const result = await callAbout(
    "getOwnerReportFile",
    { email, exportId, format, index },
    FILE_TIMEOUT_MS,
  );
  const status = readStatus(result);
  if (status === "missing") {
    throw new OwnerError(msg("Không tìm thấy file báo cáo."), 404);
  }
  const data = readString(result, "data");
  const total = result["total"];
  const size = result["size"];
  const name = readString(result, "name");
  if (
    status !== "ok" ||
    data === null ||
    typeof total !== "number" ||
    typeof size !== "number" ||
    name === null
  ) {
    throw new CompanyBridgeError("Apps Script trả file không hợp lệ.", "failed");
  }
  return { bytes: new Uint8Array(Buffer.from(data, "base64")), total, size, name };
}

export interface OwnerFile {
  readonly name: string;
  readonly size: number;
  readonly stream: ReadableStream<Uint8Array>;
}

export async function openOwnerFile(
  email: string,
  exportId: string,
  format: ReportArchiveFormat,
): Promise<OwnerFile> {
  const first = await fetchFileChunk(email, exportId, format, 0);
  let next = 1;
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(first.bytes);
      if (first.total <= 1) {
        controller.close();
      }
    },
    async pull(controller) {
      if (next >= first.total) {
        return;
      }
      try {
        const chunk = await fetchFileChunk(email, exportId, format, next);
        next += 1;
        controller.enqueue(chunk.bytes);
        if (next >= first.total) {
          controller.close();
        }
      } catch (error) {
        controller.error(error);
      }
    },
  });
  return { name: first.name, size: first.size, stream };
}

export function contentDisposition(name: string): string {
  const ascii = name.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_");
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(name)}`;
}
