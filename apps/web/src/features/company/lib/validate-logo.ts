import { LOGO_ACCEPTED_MIME_TYPES, MAX_LOGO_SIZE_BYTES } from "@esg/shared";

import type { TFunction } from "@/features/locale";

export const LOGO_ACCEPTED_TYPES = LOGO_ACCEPTED_MIME_TYPES;

export const LOGO_MAX_BYTES = MAX_LOGO_SIZE_BYTES;

export function validateLogoFile(file: File, t: TFunction): string | null {
  const isAccepted = (LOGO_ACCEPTED_TYPES as readonly string[]).includes(
    file.type,
  );
  if (!isAccepted) {
    return t("Logo phải là ảnh PNG, JPG hoặc WEBP.");
  }
  if (file.size > LOGO_MAX_BYTES) {
    return t("Logo không được lớn hơn 2 MB.");
  }
  return null;
}
