import { myReportListSchema, myReportSnapshotResponseSchema } from "@esg/shared";
import type { MyReport, ReportArchiveFormat, ReportSnapshot } from "@esg/shared";

import { downloadBlob } from "@/lib/download-blob";

export class MyReportsError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "MyReportsError";
    this.status = status;
  }
}

const GENERIC_ERROR = "Không kết nối được. Vui lòng thử lại.";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

async function failure(response: Response): Promise<MyReportsError> {
  const payload: unknown = await response.json().catch(() => null);
  const error = isRecord(payload) ? payload["error"] : null;
  return new MyReportsError(
    isRecord(error) && typeof error["message"] === "string"
      ? error["message"]
      : GENERIC_ERROR,
    response.status,
  );
}

async function request(url: string, init: RequestInit = {}): Promise<Response> {
  try {
    return await fetch(url, { cache: "no-store", ...init });
  } catch {
    throw new MyReportsError(GENERIC_ERROR, 0);
  }
}

export type MyReportsResult =
  | { readonly signedIn: false }
  | { readonly signedIn: true; readonly email: string; readonly reports: MyReport[] };

export async function fetchMyReports(): Promise<MyReportsResult> {
  const response = await request("/api/my-reports");
  if (response.status === 401) {
    return { signedIn: false };
  }
  if (!response.ok) {
    throw await failure(response);
  }
  const payload: unknown = await response.json().catch(() => null);
  const parsed = myReportListSchema.safeParse(payload);
  const email = isRecord(payload) ? payload["email"] : null;
  if (!parsed.success || typeof email !== "string") {
    throw new MyReportsError(GENERIC_ERROR, 0);
  }
  return { signedIn: true, email, reports: parsed.data.reports };
}

export async function fetchMyReportSnapshot(
  exportId: string,
): Promise<{ snapshot: ReportSnapshot; reportCode: string }> {
  const response = await request(`/api/my-reports/${exportId}/snapshot`);
  if (!response.ok) {
    throw await failure(response);
  }
  const parsed = myReportSnapshotResponseSchema.safeParse(
    await response.json().catch(() => null),
  );
  if (!parsed.success) {
    throw new MyReportsError(GENERIC_ERROR, 0);
  }
  return parsed.data;
}

export async function deleteMyReport(exportId: string): Promise<void> {
  const response = await request(`/api/my-reports/${exportId}`, { method: "DELETE" });
  if (!response.ok) {
    throw await failure(response);
  }
}

function fileNameFrom(response: Response, fallback: string): string {
  const header = response.headers.get("content-disposition") ?? "";
  const encoded = /filename\*=UTF-8''([^;]+)/i.exec(header)?.[1];
  if (encoded !== undefined) {
    try {
      return decodeURIComponent(encoded);
    } catch {
      return fallback;
    }
  }
  return /filename="([^"]+)"/i.exec(header)?.[1] ?? fallback;
}

export async function downloadMyReportFile(
  exportId: string,
  format: ReportArchiveFormat,
): Promise<void> {
  const response = await request(`/api/my-reports/${exportId}/file?format=${format}`);
  if (!response.ok) {
    throw await failure(response);
  }
  const blob = await response.blob();
  downloadBlob(blob, fileNameFrom(response, `${exportId}.${format}`));
}

export async function signOutMyReports(): Promise<void> {
  const response = await request("/api/auth/logout", { method: "POST" });
  if (!response.ok) {
    throw await failure(response);
  }
}
