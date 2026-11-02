import type { LogoMimeType } from "@esg/shared";

export function detectImageType(bytes: Uint8Array): LogoMimeType | null {
  const startsWith = (signature: readonly number[], offset = 0): boolean =>
    signature.every((value, index) => bytes[offset + index] === value);

  if (startsWith([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return "image/png";
  }
  if (startsWith([0xff, 0xd8, 0xff])) {
    return "image/jpeg";
  }
  if (
    startsWith([0x52, 0x49, 0x46, 0x46]) &&
    startsWith([0x57, 0x45, 0x42, 0x50], 8)
  ) {
    return "image/webp";
  }
  return null;
}

export const LOGO_EXTENSIONS: Record<LogoMimeType, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};
