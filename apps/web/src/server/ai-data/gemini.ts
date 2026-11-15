import { z } from "zod";

const DEFAULT_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";

const responseSchema = z.object({
  candidates: z
    .array(
      z.object({
        finishReason: z.string().optional(),
        content: z
          .object({
            parts: z.array(z.object({ text: z.string().optional() })).default([]),
          })
          .optional(),
      }),
    )
    .default([]),
});

export interface JsonAnswer {
  readonly text: string;
  readonly finishReason: string;
}

export class GeminiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "GeminiError";
    this.status = status;
  }
}

const NETWORK_ATTEMPTS = 3;
const REQUEST_TIMEOUT_MS = 280_000;

function describeNetworkError(error: unknown): string {
  if (error instanceof Error) {
    const cause: unknown = error.cause;
    if (cause instanceof Error) {
      const code = (cause as Error & { code?: string }).code;
      return `${code ? `${code}: ` : ""}${cause.message}`;
    }
    return error.message;
  }
  return String(error);
}

async function fetchWithRetry(
  url: string,
  init: RequestInit,
  attempts: number,
  timeoutMs: number,
): Promise<Response> {
  let lastError = "";
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
    } catch (error) {
      lastError = describeNetworkError(error);
      if (attempt < attempts) {
        await new Promise((resolve) => setTimeout(resolve, 3000 * attempt));
      }
    }
  }
  throw new GeminiError(
    `Không kết nối được tới Gemini sau ${attempts} lần thử (${lastError}). Kiểm tra mạng, VPN hoặc tường lửa trên máy đang chạy web.`,
    0,
  );
}

export interface GeminiImage {
  readonly mimeType: string;
  readonly data: string;
}

export async function generateJson(input: {
  readonly apiKey: string;
  readonly model: string;
  readonly prompt: string;
  readonly images?: readonly GeminiImage[];
  readonly responseSchema?: unknown;
  readonly maxOutputTokens?: number;
  readonly timeoutMs?: number;
  readonly attempts?: number;
  readonly baseUrl?: string;
}): Promise<JsonAnswer> {
  const imageParts = (input.images ?? []).map((image) => ({
    inlineData: { mimeType: image.mimeType, data: image.data },
  }));
  const response = await fetchWithRetry(
    `${input.baseUrl ?? DEFAULT_BASE_URL}/${input.model}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": input.apiKey,
      },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [...imageParts, { text: input.prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          ...(input.responseSchema === undefined ? {} : { responseSchema: input.responseSchema }),
          maxOutputTokens: input.maxOutputTokens ?? 32768,
        },
      }),
    },
    input.attempts ?? NETWORK_ATTEMPTS,
    input.timeoutMs ?? REQUEST_TIMEOUT_MS,
  );

  if (!response.ok) {
    const detail = (await response.text()).slice(0, 1500);
    throw new GeminiError(
      `Gemini trả lỗi ${response.status}: ${detail}`,
      response.status,
    );
  }

  const parsed = responseSchema.safeParse(await response.json());
  if (!parsed.success) {
    throw new GeminiError("Phản hồi của Gemini không đúng định dạng dự kiến.", 0);
  }
  const candidate = parsed.data.candidates[0];
  return {
    text: (candidate?.content?.parts ?? []).map((part) => part.text ?? "").join(""),
    finishReason: candidate?.finishReason ?? "",
  };
}

export function extractJson(text: string): unknown {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(text);
  const raw = fenced?.[1] ?? text;
  const start = raw.search(/[[{]/);
  const end = Math.max(raw.lastIndexOf("]"), raw.lastIndexOf("}"));
  if (start < 0 || end <= start) {
    throw new Error("Không tìm thấy JSON trong câu trả lời của AI.");
  }
  return JSON.parse(raw.slice(start, end + 1));
}
