import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
export const ATTACH_MAX_AGE_MS = 6 * 60 * 60 * 1000;

function sign(secret: string, scope: string, payload: string): string {
  return createHmac("sha256", secret).update(`${scope}:${payload}`).digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function createSessionToken(
  email: string,
  expiresAt: number,
  secret: string,
): string {
  const payload = Buffer.from(JSON.stringify({ e: email, x: expiresAt })).toString(
    "base64url",
  );
  return `${payload}.${sign(secret, "session", payload)}`;
}

export function parseSessionToken(
  token: string,
  secret: string,
  now: number = Date.now(),
): string | null {
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra !== undefined) {
    return null;
  }
  if (!safeEqual(signature, sign(secret, "session", payload))) {
    return null;
  }
  let data: unknown;
  try {
    data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  if (typeof data !== "object" || data === null) {
    return null;
  }
  const record = data as Record<string, unknown>;
  const email = record["e"];
  const expiresAt = record["x"];
  if (
    typeof email !== "string" ||
    typeof expiresAt !== "number" ||
    !Number.isFinite(expiresAt) ||
    expiresAt <= now
  ) {
    return null;
  }
  return email;
}

export function createAttachToken(
  exportId: string,
  issuedAt: number,
  secret: string,
): string {
  return `${issuedAt}.${sign(secret, "attach", `${exportId}:${issuedAt}`)}`;
}

export function verifyAttachToken(
  token: string,
  exportId: string,
  secret: string,
  now: number = Date.now(),
): boolean {
  const [issuedRaw, signature, extra] = token.split(".");
  const issuedAt = Number(issuedRaw);
  if (!signature || extra !== undefined || !Number.isInteger(issuedAt)) {
    return false;
  }
  if (issuedAt > now + 60_000 || now - issuedAt > ATTACH_MAX_AGE_MS) {
    return false;
  }
  return safeEqual(signature, sign(secret, "attach", `${exportId}:${issuedAt}`));
}
