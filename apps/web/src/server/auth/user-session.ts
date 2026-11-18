import "server-only";

import { cookies } from "next/headers";

import { getServerEnv } from "../env";

import {
  SESSION_MAX_AGE_MS,
  createAttachToken,
  createSessionToken,
  parseSessionToken,
  verifyAttachToken,
} from "./session-token";

export const USER_COOKIE_NAME = "esg-user";

export function getUserSecret(): string | null {
  return getServerEnv().USER_SESSION_SECRET ?? null;
}

export function isUserSessionConfigured(): boolean {
  return getUserSecret() !== null;
}

export async function readSessionEmail(): Promise<string | null> {
  const secret = getUserSecret();
  if (secret === null) {
    return null;
  }
  const store = await cookies();
  const raw = store.get(USER_COOKIE_NAME)?.value;
  return raw ? parseSessionToken(raw, secret) : null;
}

export async function startUserSession(email: string): Promise<void> {
  const secret = getUserSecret();
  if (secret === null) {
    return;
  }
  const expiresAt = Date.now() + SESSION_MAX_AGE_MS;
  const store = await cookies();
  store.set(USER_COOKIE_NAME, createSessionToken(email, expiresAt, secret), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: Math.floor(SESSION_MAX_AGE_MS / 1000),
  });
}

export async function endUserSession(): Promise<void> {
  const store = await cookies();
  store.delete(USER_COOKIE_NAME);
}

export function issueAttachToken(exportId: string): string | null {
  const secret = getUserSecret();
  return secret === null ? null : createAttachToken(exportId, Date.now(), secret);
}

export function checkAttachToken(token: string, exportId: string): boolean {
  const secret = getUserSecret();
  return secret !== null && verifyAttachToken(token, exportId, secret);
}
