import { z } from "zod";

import { streamEventSchema } from "../types";
import type { AiDataResult } from "../types";

const errorBodySchema = z.object({
  error: z.object({ message: z.string() }),
});

export class AiDataRunError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiDataRunError";
  }
}

export async function runAiData(
  form: FormData,
  onStep: (message: string) => void,
): Promise<AiDataResult> {
  let response: Response;
  try {
    response = await fetch("/api/ai-data/run", { method: "POST", body: form });
  } catch {
    throw new AiDataRunError("Không kết nối được tới máy chủ. Hãy kiểm tra web đang chạy.");
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!response.ok || !contentType.includes("ndjson") || response.body === null) {
    const parsed = errorBodySchema.safeParse(await response.json().catch(() => null));
    throw new AiDataRunError(
      parsed.success ? parsed.data.error.message : "Không chạy được công cụ.",
    );
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let result: AiDataResult | null = null;

  function handle(line: string) {
    if (line.trim() === "") {
      return;
    }
    let raw: unknown;
    try {
      raw = JSON.parse(line);
    } catch {
      return;
    }
    const event = streamEventSchema.safeParse(raw);
    if (!event.success) {
      return;
    }
    if (event.data.type === "step") {
      onStep(event.data.message);
    } else if (event.data.type === "error") {
      throw new AiDataRunError(event.data.message);
    } else {
      result = event.data.result;
    }
  }

  for (;;) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      handle(line);
    }
  }
  handle(buffer);

  if (result === null) {
    throw new AiDataRunError("Kết nối bị ngắt trước khi có kết quả. Hãy chạy lại.");
  }
  return result;
}
