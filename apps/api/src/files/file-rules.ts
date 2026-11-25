import type { FileKind } from "../database/schema/index.js";

export const MIME_PNG = "image/png";
export const MIME_JPEG = "image/jpeg";
export const MIME_WEBP = "image/webp";
export const MIME_PDF = "application/pdf";
export const MIME_DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export type FileMime =
  | typeof MIME_PNG
  | typeof MIME_JPEG
  | typeof MIME_WEBP
  | typeof MIME_PDF
  | typeof MIME_DOCX;

export const FILE_EXTENSIONS: Readonly<Record<FileMime, string>> = {
  [MIME_PNG]: "png",
  [MIME_JPEG]: "jpg",
  [MIME_WEBP]: "webp",
  [MIME_PDF]: "pdf",
  [MIME_DOCX]: "docx",
};

export type UploadKind = Extract<FileKind, "logo" | "evidence" | "export_pdf" | "export_docx">;

export interface FileRule {
  readonly mimes: readonly FileMime[];
  readonly maxBytes: number;
}

const MB = 1024 * 1024;

export const FILE_RULES: Readonly<Record<UploadKind, FileRule>> = {
  logo: { mimes: [MIME_PNG, MIME_JPEG, MIME_WEBP], maxBytes: 2 * MB },
  evidence: { mimes: [MIME_PDF, MIME_PNG, MIME_JPEG, MIME_WEBP], maxBytes: 10 * MB },
  export_pdf: { mimes: [MIME_PDF], maxBytes: 25 * MB },
  export_docx: { mimes: [MIME_DOCX], maxBytes: 25 * MB },
};

export const MAX_UPLOAD_BYTES = 25 * MB;
export const MAX_EVIDENCE_FILES_PER_REPORT = 10;

export const FILE_UNREFERENCED_GRACE_HOURS = 24;
export const FILE_PURGE_GRACE_DAYS = 7;
