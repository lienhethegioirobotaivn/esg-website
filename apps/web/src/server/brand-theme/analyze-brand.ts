import {
  DEFAULT_REPORT_THEME,
  brandSuggestionSchema,
  buildBrandTheme,
  themeFromPalette,
} from "@esg/shared";
import type { BrandThemeResult, PaletteColor } from "@esg/shared";

import { GeminiError, extractJson, generateJson } from "@/server/ai-data/gemini";
import type { JsonAnswer } from "@/server/ai-data/gemini";

import { BRAND_RESPONSE_SCHEMA, buildBrandPrompt } from "./prompts";
import { hasDayCapacity, hasIpCapacity, recordUse } from "./limits";
import type { RateWindow } from "./limits";

export interface BrandImageInput {
  readonly mimeType: string;
  readonly bytes: Uint8Array;
}

export type BrandGenerate = (input: {
  readonly apiKey: string;
  readonly model: string;
  readonly prompt: string;
  readonly images: readonly { readonly mimeType: string; readonly data: string }[];
  readonly responseSchema?: unknown;
  readonly maxOutputTokens: number;
  readonly timeoutMs: number;
  readonly attempts: number;
  readonly baseUrl?: string;
}) => Promise<JsonAnswer>;

export interface AnalyzeBrandOptions {
  readonly images: readonly BrandImageInput[];
  readonly palette: readonly PaletteColor[];
  readonly consent: boolean;
  readonly apiKey?: string;
  readonly model: string;
  readonly baseUrl?: string;
  readonly rate: {
    readonly window: RateWindow;
    readonly key: string;
    readonly ipLimit: number;
    readonly dailyLimit: number;
  };
  readonly generate?: BrandGenerate;
  readonly now?: number;
}

type FallbackReason = Exclude<BrandThemeResult["reason"], "none">;

const AI_TIMEOUT_MS = 45_000;
const AI_ATTEMPTS = 2;
const AI_MAX_OUTPUT_TOKENS = 1024;

function toBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64");
}

function fallback(palette: readonly PaletteColor[], reason: FallbackReason): BrandThemeResult {
  const theme = themeFromPalette(palette) ?? {
    version: 1 as const,
    colors: {
      primary: DEFAULT_REPORT_THEME.colors.primary,
      accent: DEFAULT_REPORT_THEME.colors.accent,
    },
  };
  return { source: "palette", reason, theme, palette: [...palette] };
}

async function callGemini(
  options: AnalyzeBrandOptions,
  apiKey: string,
  generate: BrandGenerate,
): Promise<JsonAnswer> {
  const base = {
    apiKey,
    model: options.model,
    prompt: buildBrandPrompt(options.palette),
    images: options.images.map((image) => ({
      mimeType: image.mimeType,
      data: toBase64(image.bytes),
    })),
    maxOutputTokens: AI_MAX_OUTPUT_TOKENS,
    timeoutMs: AI_TIMEOUT_MS,
    attempts: AI_ATTEMPTS,
    baseUrl: options.baseUrl,
  };
  try {
    return await generate({ ...base, responseSchema: BRAND_RESPONSE_SCHEMA });
  } catch (error) {
    if (error instanceof GeminiError && error.status === 400) {
      return generate(base);
    }
    throw error;
  }
}

export async function analyzeBrand(options: AnalyzeBrandOptions): Promise<BrandThemeResult> {
  const { palette } = options;
  if (!options.consent) {
    return fallback(palette, "no-consent");
  }
  if (options.apiKey === undefined || options.images.length === 0) {
    return fallback(palette, "not-configured");
  }
  const now = options.now ?? Date.now();
  const { window, key, ipLimit, dailyLimit } = options.rate;
  if (!hasIpCapacity(window, key, ipLimit, now) || !hasDayCapacity(window, dailyLimit, now)) {
    return fallback(palette, "quota");
  }
  recordUse(window, key, now);

  try {
    const answer = await callGemini(options, options.apiKey, options.generate ?? generateJson);
    const suggestion = brandSuggestionSchema.safeParse(extractJson(answer.text));
    if (!suggestion.success) {
      return fallback(palette, "error");
    }
    return {
      source: "ai",
      reason: "none",
      theme: buildBrandTheme(suggestion.data, palette),
      palette: [...palette],
    };
  } catch (error) {
    if (error instanceof GeminiError && error.status === 429) {
      return fallback(palette, "quota");
    }
    console.error("brand-theme: phân tích bằng AI thất bại", error);
    return fallback(palette, "error");
  }
}
