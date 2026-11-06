import { z } from "zod";

const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";

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

async function fetchWithRetry(url: string, init: RequestInit): Promise<Response> {
  let lastError = "";
  for (let attempt = 1; attempt <= NETWORK_ATTEMPTS; attempt += 1) {
    try {
      return await fetch(url, { ...init, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
    } catch (error) {
      lastError = describeNetworkError(error);
      if (attempt < NETWORK_ATTEMPTS) {
        await new Promise((resolve) => setTimeout(resolve, 3000 * attempt));
      }
    }
  }
  throw new GeminiError(
    `Không kết nối được tới Gemini sau ${NETWORK_ATTEMPTS} lần thử (${lastError}). Kiểm tra mạng, VPN hoặc tường lửa trên máy đang chạy web.`,
    0,
  );
}

export async function generateJson(input: {
  readonly apiKey: string;
  readonly model: string;
  readonly prompt: string;
}): Promise<JsonAnswer> {
  const response = await fetchWithRetry(`${ENDPOINT}/${input.model}:generateContent`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": input.apiKey,
    },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: input.prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        maxOutputTokens: 32768,
      },
    }),
  });

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
