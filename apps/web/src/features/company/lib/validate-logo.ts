export const LOGO_ACCEPTED_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
] as const;

export const LOGO_MAX_BYTES = 2 * 1024 * 1024;

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
