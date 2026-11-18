import type { ReportArchiveFormat, ReportFinishInput } from "@esg/shared";

export class ReportArchiveError extends Error {
  readonly retryable: boolean;

  constructor(message: string, retryable: boolean) {
    super(message);
    this.name = "ReportArchiveError";
    this.retryable = retryable;
  }
}

const GENERIC_ERROR = "Không lưu được báo cáo.";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

async function readFailure(response: Response): Promise<ReportArchiveError> {
  const payload: unknown = await response.json().catch(() => null);
  const error = isRecord(payload) ? payload["error"] : null;
  const message =
    isRecord(error) && typeof error["message"] === "string"
      ? error["message"]
      : GENERIC_ERROR;
  return new ReportArchiveError(message, response.status >= 500);
}

export async function postReportChunk(input: {
  uploadId: string;
  format: ReportArchiveFormat;
  index: number;
  total: number;
  chunk: Blob;
}): Promise<void> {
  const body = new FormData();
  body.append("uploadId", input.uploadId);
  body.append("format", input.format);
  body.append("index", String(input.index));
  body.append("total", String(input.total));
  body.append("chunk", input.chunk, `${input.format}-${input.index}.part`);

  let response: Response;
  try {
    response = await fetch("/api/reports/upload", { method: "POST", body });
  } catch {
    throw new ReportArchiveError(GENERIC_ERROR, true);
  }
  if (!response.ok) {
    throw await readFailure(response);
  }
}

export interface ReportFinishResult {
  readonly exportId: string;
  readonly attachToken: string | null;
}

export async function postReportFinish(
  payload: ReportFinishInput,
): Promise<ReportFinishResult> {
  let response: Response;
  try {
    response = await fetch("/api/reports/finish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new ReportArchiveError(GENERIC_ERROR, true);
  }
  if (!response.ok) {
    throw await readFailure(response);
  }
  const result: unknown = await response.json().catch(() => null);
  const exportId = isRecord(result) ? result["exportId"] : null;
  if (typeof exportId !== "string") {
    throw new ReportArchiveError(GENERIC_ERROR, false);
  }
  const attachToken = isRecord(result) ? result["attachToken"] : null;
  return {
    exportId,
    attachToken: typeof attachToken === "string" ? attachToken : null,
  };
}

export async function postReportAttach(input: {
  exportId: string;
  attachToken: string;
}): Promise<void> {
  let response: Response;
  try {
    response = await fetch("/api/reports/attach", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
  } catch {
    throw new ReportArchiveError(GENERIC_ERROR, true);
  }
  if (!response.ok) {
    throw await readFailure(response);
  }
}
