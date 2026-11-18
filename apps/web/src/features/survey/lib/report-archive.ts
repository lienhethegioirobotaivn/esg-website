import { REPORT_ARCHIVE_LIMITS, countReportChunks } from "@esg/shared";
import type {
  ReportArchiveFormat,
  ReportArchiveLocale,
  ReportFinishInput,
  ReportSnapshot,
} from "@esg/shared";

import {
  ReportArchiveError,
  postReportChunk,
  postReportFinish,
} from "../services/report-archive.service";

const CHUNK_ATTEMPTS = 3;
const RETRY_DELAY_MS = 800;

export interface ArchiveFile {
  readonly format: ReportArchiveFormat;
  readonly name: string;
  readonly blob: Blob;
}

export interface ArchiveInput {
  readonly reportCode: string;
  readonly files: readonly ArchiveFile[];
  readonly locale: ReportArchiveLocale;
  readonly isDraft: boolean;
  readonly isBrandTheme: boolean;
  readonly companyName: string;
  readonly snapshot: ReportSnapshot;
}

export function splitBlob(
  blob: Blob,
  chunkBytes: number = REPORT_ARCHIVE_LIMITS.chunkBytes,
): Blob[] {
  const total = countReportChunks(blob.size, chunkBytes);
  const parts: Blob[] = [];
  for (let index = 0; index < total; index += 1) {
    parts.push(blob.slice(index * chunkBytes, (index + 1) * chunkBytes));
  }
  return parts;
}

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function sendChunk(
  send: () => Promise<void>,
  delayMs: number,
): Promise<void> {
  for (let attempt = 1; ; attempt += 1) {
    try {
      await send();
      return;
    } catch (error) {
      const retryable = error instanceof ReportArchiveError && error.retryable;
      if (!retryable || attempt >= CHUNK_ATTEMPTS) {
        throw error;
      }
      await wait(delayMs * attempt);
    }
  }
}

export async function archiveReport(
  input: ArchiveInput,
  retryDelayMs: number = RETRY_DELAY_MS,
): Promise<string> {
  const uploadId = crypto.randomUUID();
  const files: ReportFinishInput["files"] = [];

  for (const file of input.files) {
    if (file.blob.size === 0 || file.blob.size > REPORT_ARCHIVE_LIMITS.maxFileBytes) {
      throw new ReportArchiveError("Kích thước file báo cáo không hợp lệ.", false);
    }
    const parts = splitBlob(file.blob);
    for (let index = 0; index < parts.length; index += 1) {
      const chunk = parts[index];
      if (chunk === undefined) {
        continue;
      }
      await sendChunk(
        () =>
          postReportChunk({
            uploadId,
            format: file.format,
            index,
            total: parts.length,
            chunk,
          }),
        retryDelayMs,
      );
    }
    files.push({
      format: file.format,
      name: file.name,
      bytes: file.blob.size,
      chunks: parts.length,
    });
  }

  return postReportFinish({
    uploadId,
    reportCode: input.reportCode,
    locale: input.locale,
    status: input.isDraft ? "draft" : "complete",
    theme: input.isBrandTheme ? "brand" : "default",
    companyName: input.companyName,
    snapshot: JSON.stringify(input.snapshot),
    files,
  });
}
