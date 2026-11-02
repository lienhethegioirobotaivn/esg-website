import { LOGO_ACCEPTED_MIME_TYPES, MAX_LOGO_SIZE_BYTES } from "@esg/shared";

export const LOGO_ACCEPTED_TYPES = LOGO_ACCEPTED_MIME_TYPES;

export const LOGO_MAX_BYTES = MAX_LOGO_SIZE_BYTES;

export function validateLogoFile(file: File): string | null {
  const isAccepted = (LOGO_ACCEPTED_TYPES as readonly string[]).includes(
    file.type,
  );
  if (!isAccepted) {
    return "Logo phải là ảnh PNG, JPG hoặc WEBP.";
  }
  if (file.size > LOGO_MAX_BYTES) {
    return "Logo không được lớn hơn 2 MB.";
  }
  return null;
}
