import {
  ACCEPTED_EVIDENCE_MIME_TYPES,
  MAX_EVIDENCE_FILE_SIZE_BYTES,
} from "@esg/shared";
import type { EvidenceMimeType } from "@esg/shared";

import { formatFileSize } from "@/lib/format";

function isAcceptedMimeType(value: string): value is EvidenceMimeType {
  return ACCEPTED_EVIDENCE_MIME_TYPES.some((mimeType) => mimeType === value);
}

export function validateEvidenceFile(file: File): string | null {
  if (!isAcceptedMimeType(file.type)) {
    return "Chỉ chấp nhận tệp PDF hoặc ảnh (PNG, JPG, WEBP).";
  }
  if (file.size > MAX_EVIDENCE_FILE_SIZE_BYTES) {
    return `Tệp vượt quá dung lượng tối đa ${formatFileSize(MAX_EVIDENCE_FILE_SIZE_BYTES)}.`;
  }
  return null;
}
