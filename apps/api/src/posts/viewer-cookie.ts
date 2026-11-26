import { readCookie } from "../auth/cookies.js";
import { VIEWER_COOKIE_NAME } from "./posts.constants.js";

const VIEWER_TOKEN = /^[A-Za-z0-9_-]{43}$/;

export function readViewerToken(cookieHeader: string | undefined): string | null {
  const value = readCookie(cookieHeader, VIEWER_COOKIE_NAME);
  return value !== null && VIEWER_TOKEN.test(value) ? value : null;
}
