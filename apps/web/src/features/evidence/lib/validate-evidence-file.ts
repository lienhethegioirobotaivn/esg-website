import {
  ACCEPTED_EVIDENCE_MIME_TYPES,
  MAX_EVIDENCE_FILE_SIZE_BYTES,
} from "@esg/shared";
import type { EvidenceMimeType } from "@esg/shared";

import type { TFunction } from "@/features/locale";
import { formatFileSize } from "@/lib/format";

function isAcceptedMimeType(value: string): value is EvidenceMimeType {
  return ACCEPTED_EVIDENCE_MIME_TYPES.some((mimeType) => mimeType === value);
}

export function validateEvidenceFile(file: File, t: TFunction): string | null {
  if (!isAcceptedMimeType(file.type)) {
    return t("Chỉ chấp nhận tệp PDF hoặc ảnh (PNG, JPG, WEBP).");
  }
  if (file.size > MAX_EVIDENCE_FILE_SIZE_BYTES) {
    return t("Tệp vượt quá dung lượng tối đa {size}.", {
      size: formatFileSize(MAX_EVIDENCE_FILE_SIZE_BYTES),
    });
  }
  return null;
}
