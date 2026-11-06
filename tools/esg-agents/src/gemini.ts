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
        groundingMetadata: z
          .object({
            groundingChunks: z
              .array(
                z.object({
                  web: z
                    .object({ uri: z.string(), title: z.string().optional() })
                    .optional(),
                }),
              )
              .default([]),
            webSearchQueries: z.array(z.string()).default([]),
          })
          .optional(),
      }),
    )
    .default([]),
});

type GenerateResponse = z.infer<typeof responseSchema>;

export interface GroundedSource {
  readonly url: string;
  readonly title: string;
}

export interface GroundedAnswer {
  readonly text: string;
  readonly sources: readonly GroundedSource[];
  readonly queries: readonly string[];
}

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

async function resolveRedirect(uri: string): Promise<string> {
  try {
    const response = await fetch(uri, { redirect: "manual" });
    return response.headers.get("location") ?? uri;
  } catch {
    return uri;
  }
}

async function postGenerate(
  apiKey: string,
  model: string,
  body: Readonly<Record<string, unknown>>,
): Promise<GenerateResponse> {
  const response = await fetch(`${ENDPOINT}/${model}:generateContent`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const detail = (await response.text()).slice(0, 4000);
    throw new GeminiError(
      `Gemini trả lỗi ${response.status}: ${detail}`,
      response.status,
    );
  }

  const parsed = responseSchema.safeParse(await response.json());
  if (!parsed.success) {
    throw new GeminiError("Phản hồi của Gemini không đúng định dạng dự kiến.", 0);
  }
  return parsed.data;
}

function textOf(response: GenerateResponse): string {
  return (response.candidates[0]?.content?.parts ?? [])
    .map((part) => part.text ?? "")
    .join("");
}

export async function generateGrounded(input: {
  readonly apiKey: string;
  readonly model: string;
  readonly prompt: string;
  readonly search?: boolean;
}): Promise<GroundedAnswer> {
  const response = await postGenerate(input.apiKey, input.model, {
    contents: [{ role: "user", parts: [{ text: input.prompt }] }],
    ...(input.search === false ? {} : { tools: [{ google_search: {} }] }),
    generationConfig: { temperature: 0 },
  });

  const candidate = response.candidates[0];
  const chunks = candidate?.groundingMetadata?.groundingChunks ?? [];
  const sources = await Promise.all(
    chunks.flatMap((chunk) =>
      chunk.web
        ? [
            resolveRedirect(chunk.web.uri).then((url) => ({
              url,
              title: chunk.web?.title ?? "",
            })),
          ]
        : [],
    ),
  );

  return {
    text: textOf(response),
    sources,
    queries: candidate?.groundingMetadata?.webSearchQueries ?? [],
  };
}

export async function generateJson(input: {
  readonly apiKey: string;
  readonly model: string;
  readonly prompt: string;
}): Promise<JsonAnswer> {
  const response = await postGenerate(input.apiKey, input.model, {
    contents: [{ role: "user", parts: [{ text: input.prompt }] }],
    generationConfig: {
      responseMimeType: "application/json",
      maxOutputTokens: 32768,
    },
  });
  return {
    text: textOf(response),
    finishReason: response.candidates[0]?.finishReason ?? "",
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
