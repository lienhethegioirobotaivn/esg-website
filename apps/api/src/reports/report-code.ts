import { randomInt } from "node:crypto";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const VIETNAM_OFFSET_MS = 7 * 3_600_000;

function vietnamDate(now: number): string {
  return new Date(now + VIETNAM_OFFSET_MS).toISOString().slice(0, 10).replaceAll("-", "");
}

function randomSuffix(length: number): string {
  let suffix = "";
  for (let index = 0; index < length; index += 1) {
    suffix += ALPHABET.charAt(randomInt(ALPHABET.length));
  }
  return suffix;
}

export function generateReportCode(now: number = Date.now()): string {
  return `ESG-${vietnamDate(now)}-${randomSuffix(4)}`;
}

export function generateExportId(now: number = Date.now()): string {
  return `RX-${vietnamDate(now)}-${randomSuffix(6)}`;
}

export function generateRecordCode(prefix: string, suffixLength: number, now: number = Date.now()): string {
  return `${prefix}-${vietnamDate(now)}-${randomSuffix(suffixLength)}`;
}
