import "server-only";

import { CompanyBridgeError } from "../company/save-company";
import { getServerEnv } from "../env";

const BRIDGE_TIMEOUT_MS = 30_000;

export function isAboutBridgeConfigured(): boolean {
  const env = getServerEnv();
  return Boolean(env.GOOGLE_APPS_SCRIPT_URL && env.GOOGLE_APPS_SCRIPT_SECRET);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function callAbout(
  action: string,
  payload: Record<string, unknown> = {},
): Promise<Record<string, unknown>> {
  const env = getServerEnv();
  if (!env.GOOGLE_APPS_SCRIPT_URL || !env.GOOGLE_APPS_SCRIPT_SECRET) {
    throw new CompanyBridgeError(
      "Chưa cấu hình GOOGLE_APPS_SCRIPT_URL hoặc GOOGLE_APPS_SCRIPT_SECRET.",
      "not-configured",
    );
  }
  let response: Response;
  try {
    response = await fetch(env.GOOGLE_APPS_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        secret: env.GOOGLE_APPS_SCRIPT_SECRET,
        action,
        ...payload,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(BRIDGE_TIMEOUT_MS),
    });
  } catch {
    throw new CompanyBridgeError("Không kết nối được tới Google Apps Script.", "failed");
  }
  const text = await response.text();
  let parsed: unknown = null;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = null;
  }
  if (!response.ok || !isRecord(parsed) || typeof parsed["ok"] !== "boolean") {
    throw new CompanyBridgeError(
      `Apps Script trả về phản hồi không hợp lệ (HTTP ${response.status}).`,
      "failed",
    );
  }
  if (!parsed["ok"]) {
    throw new CompanyBridgeError(
      typeof parsed["error"] === "string"
        ? parsed["error"]
        : "Apps Script báo lỗi không rõ nguyên nhân.",
      "failed",
    );
  }
  return parsed;
}
