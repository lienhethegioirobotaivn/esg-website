import type { TargetLocale } from "./glossary";

const LANGUAGE_CODES: Record<TargetLocale, string> = {
  en: "en",
  fr: "fr",
  zh: "zh-CN",
};

const REQUEST_TIMEOUT_MS = 120_000;
const RETRY_DELAYS_MS = [1_500, 4_000];

export interface ProviderConfig {
  url: string;
  secret: string;
}

export function readProviderConfig(): ProviderConfig | null {
  const url = process.env["GOOGLE_APPS_SCRIPT_URL"]?.trim();
  const secret = process.env["GOOGLE_APPS_SCRIPT_SECRET"]?.trim();
  return url && secret ? { url, secret } : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function requestOnce(
  config: ProviderConfig,
  locale: TargetLocale,
  texts: string[],
): Promise<string[]> {
  const response = await fetch(config.url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      secret: config.secret,
      action: "translate",
      source: "vi",
      target: LANGUAGE_CODES[locale],
      texts,
    }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  const raw = await response.text();
  let parsed: unknown = null;
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = null;
  }
  if (!response.ok || !isRecord(parsed)) {
    throw new Error(`Apps Script trả về phản hồi không hợp lệ (HTTP ${response.status}).`);
  }
  if (parsed["ok"] !== true) {
    const detail = typeof parsed["error"] === "string" ? parsed["error"] : "lỗi không rõ";
    throw new Error(`Apps Script báo lỗi: ${detail}`);
  }
  const translations = parsed["translations"];
  if (
    !Array.isArray(translations) ||
    translations.length !== texts.length ||
    !translations.every((item) => typeof item === "string")
  ) {
    throw new Error("Apps Script trả về số bản dịch không khớp.");
  }
  return translations as string[];
}

export async function translateBatch(
  config: ProviderConfig,
  locale: TargetLocale,
  texts: string[],
): Promise<string[]> {
  let lastError: unknown = null;
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt += 1) {
    try {
      return await requestOnce(config, locale, texts);
    } catch (error) {
      lastError = error;
      const delay = RETRY_DELAYS_MS[attempt];
      if (delay !== undefined) {
        await sleep(delay);
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Không dịch được.");
}
