import { hmacHex, safeEqualHex } from "../auth/crypto.js";

export type TokenPurpose = "attach" | "claim";

export const TOKEN_TTL_MS: Readonly<Record<TokenPurpose, number>> = {
  attach: 6 * 3_600_000,
  claim: 24 * 3_600_000,
};

export function signToken(
  secret: string,
  purpose: TokenPurpose,
  subject: string,
  issuedAt: number = Date.now(),
): string {
  return `${issuedAt}.${hmacHex(secret, `${purpose}:${subject}:${issuedAt}`)}`;
}

export function verifyToken(
  secret: string,
  purpose: TokenPurpose,
  subject: string,
  token: string,
  now: number = Date.now(),
): boolean {
  const separator = token.indexOf(".");
  if (separator < 1) {
    return false;
  }
  const issuedAt = Number(token.slice(0, separator));
  if (!Number.isSafeInteger(issuedAt) || issuedAt > now + 60_000 || now - issuedAt > TOKEN_TTL_MS[purpose]) {
    return false;
  }
  const expected = hmacHex(secret, `${purpose}:${subject}:${issuedAt}`);
  return safeEqualHex(expected, token.slice(separator + 1));
}
