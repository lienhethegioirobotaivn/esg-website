import {
  MIME_DOCX,
  MIME_JPEG,
  MIME_PDF,
  MIME_PNG,
  MIME_WEBP,
  type FileMime,
} from "./file-rules.js";

const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const JPEG = [0xff, 0xd8, 0xff];
const PDF = [0x25, 0x50, 0x44, 0x46, 0x2d];
const ZIP = [0x50, 0x4b, 0x03, 0x04];
const RIFF = [0x52, 0x49, 0x46, 0x46];
const WEBP = [0x57, 0x45, 0x42, 0x50];

function startsWith(bytes: Uint8Array, signature: readonly number[], offset = 0): boolean {
  return signature.every((value, index) => bytes[offset + index] === value);
}

export function detectFileType(bytes: Uint8Array): FileMime | null {
  if (startsWith(bytes, PNG)) {
    return MIME_PNG;
  }
  if (startsWith(bytes, JPEG)) {
    return MIME_JPEG;
  }
  if (startsWith(bytes, RIFF) && startsWith(bytes, WEBP, 8)) {
    return MIME_WEBP;
  }
  if (startsWith(bytes, PDF)) {
    return MIME_PDF;
  }
  if (startsWith(bytes, ZIP)) {
    return MIME_DOCX;
  }
  return null;
}
