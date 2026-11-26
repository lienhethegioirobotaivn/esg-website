import { createHash } from "node:crypto";

export function hashText(text: string): string {
  return createHash("sha256").update(text.normalize("NFC")).digest("hex").slice(0, 16);
}

export function isTranslatable(text: string): boolean {
  return /\p{L}/u.test(text);
}

export function uniqueTranslatable(texts: readonly string[]): string[] {
  return [...new Set(texts)].filter(isTranslatable);
}
