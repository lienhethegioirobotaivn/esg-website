export class AccountError extends Error {
  readonly status: number;
  readonly retryAfter: number | null;
  readonly triesLeft: number | null;

  constructor(
    message: string,
    status: number,
    retryAfter: number | null = null,
    triesLeft: number | null = null,
  ) {
    super(message);
    this.name = "AccountError";
    this.status = status;
    this.retryAfter = retryAfter;
    this.triesLeft = triesLeft;
  }
}

const GENERIC_ERROR = "Không kết nối được. Vui lòng thử lại.";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readNumber(source: Record<string, unknown>, key: string): number | null {
  const value = source[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

async function send(
  url: string,
  init: RequestInit,
): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(url, init);
  } catch {
    throw new AccountError(GENERIC_ERROR, 0);
  }
  const payload: unknown = await response.json().catch(() => null);
  if (response.ok) {
    return payload;
  }
  const error = isRecord(payload) ? payload["error"] : null;
  throw new AccountError(
    isRecord(error) && typeof error["message"] === "string"
      ? error["message"]
      : GENERIC_ERROR,
    response.status,
    isRecord(error) ? readNumber(error, "retryAfter") : null,
    isRecord(error) ? readNumber(error, "triesLeft") : null,
  );
}

function postJson(url: string, body: Record<string, unknown>): Promise<unknown> {
  return send(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function fetchSessionEmail(): Promise<string | null> {
  try {
    const payload = await send("/api/auth/me", { cache: "no-store" });
    const email = isRecord(payload) ? payload["email"] : null;
    return typeof email === "string" ? email : null;
  } catch {
    return null;
  }
}

export async function requestEmailCode(input: {
  email: string;
  locale: string;
}): Promise<{ resendAfter: number }> {
  const payload = await postJson("/api/auth/email/request", input);
  const resendAfter = isRecord(payload) ? readNumber(payload, "resendAfter") : null;
  return { resendAfter: resendAfter ?? 60 };
}

export async function verifyEmailCode(input: {
  email: string;
  code: string;
}): Promise<string> {
  const payload = await postJson("/api/auth/email/verify", input);
  const email = isRecord(payload) ? payload["email"] : null;
  if (typeof email !== "string") {
    throw new AccountError(GENERIC_ERROR, 0);
  }
  return email;
}

export async function logoutEmail(): Promise<void> {
  await send("/api/auth/logout", { method: "POST" });
}
