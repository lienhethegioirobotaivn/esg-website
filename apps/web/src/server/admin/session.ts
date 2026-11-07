import "server-only";

import { createHash, createHmac, timingSafeEqual } from "node:crypto";

import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { getServerEnv } from "../env";

const COOKIE_NAME = "esg-admin";
const SESSION_SECONDS = 7 * 24 * 60 * 60;
const MAX_ATTEMPTS = 5;
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000;

const attempts = new Map<string, { count: number; resetAt: number }>();

export function isAdminConfigured(): boolean {
  return getServerEnv().ADMIN_PASSWORD !== undefined;
}

function signingKey(): string {
  const env = getServerEnv();
  return env.ADMIN_SESSION_SECRET ?? env.ADMIN_PASSWORD ?? "";
}

function sign(expiresAt: number): string {
  return createHmac("sha256", signingKey())
    .update(`admin:${expiresAt}`)
    .digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  const left = createHash("sha256").update(a).digest();
  const right = createHash("sha256").update(b).digest();
  return timingSafeEqual(left, right);
}

export function verifyPassword(input: string): boolean {
  const expected = getServerEnv().ADMIN_PASSWORD;
  return expected !== undefined && safeEqual(input, expected);
}

export function checkAttempts(key: string): boolean {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || entry.resetAt < now) {
    return true;
  }
  return entry.count < MAX_ATTEMPTS;
}

export function recordFailure(key: string): void {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || entry.resetAt < now) {
    attempts.set(key, { count: 1, resetAt: now + ATTEMPT_WINDOW_MS });
    return;
  }
  entry.count += 1;
}

export function clearFailures(key: string): void {
  attempts.delete(key);
}

export async function startSession(): Promise<void> {
  const expiresAt = Date.now() + SESSION_SECONDS * 1000;
  const store = await cookies();
  store.set(COOKIE_NAME, `${expiresAt}.${sign(expiresAt)}`, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_SECONDS,
  });
}

export async function endSession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export async function isAdmin(): Promise<boolean> {
  if (!isAdminConfigured()) {
    return false;
  }
  const store = await cookies();
  const raw = store.get(COOKIE_NAME)?.value;
  if (!raw) {
    return false;
  }
  const [expiresRaw, signature] = raw.split(".");
  const expiresAt = Number(expiresRaw);
  if (!signature || !Number.isFinite(expiresAt) || expiresAt < Date.now()) {
    return false;
  }
  return safeEqual(signature, sign(expiresAt));
}

export async function requireAdminApi(): Promise<NextResponse | null> {
  if (await isAdmin()) {
    return null;
  }
  return NextResponse.json(
    { error: { message: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại." } },
    { status: 401 },
  );
}
