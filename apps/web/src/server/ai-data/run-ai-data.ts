import "server-only";

import { selectSurvey } from "@esg/shared";
import type { Survey } from "@esg/shared";

import type { AiDataResult } from "@/features/ai-data/types";

import { aiResultSchema, buildDraft } from "./build-draft";
import type { AiResult } from "./build-draft";
import { GeminiError, extractJson, generateJson } from "./gemini";
import { extractSource } from "./pdf";
import { companyPrompt, fullPrompt, groupQuestions, pillarPrompt } from "./prompts";
import { parseSourceText } from "./verify";

const RATE_WAIT_MS = 65_000;

export class AiDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiDataError";
  }
}

export interface AiDataInput {
  readonly name: string;
  readonly industry: string;
  readonly headcount: string;
  readonly year: string;
  readonly pages: string | undefined;
  readonly split: boolean;
  readonly bytes: Uint8Array;
  readonly sourceLabel: string;
}

export interface AiDataDeps {
  readonly survey: Survey;
  readonly apiKey: string;
  readonly model: string;
  readonly report: (message: string) => void;
}

interface Part {
  readonly tag: string;
  readonly prompt: string;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function describe(error: unknown): string {
  if (error instanceof GeminiError) {
    if (error.status === 429) {
      return "AI đã hết lượt dùng miễn phí trong phút hoặc trong ngày. Hãy chờ một lúc rồi chạy lại, hoặc đổi sang model khác trong cấu hình.";
    }
    if (error.status === 400 || error.status === 403) {
      return "Gemini từ chối yêu cầu. Kiểm tra GEMINI_API_KEY và tên model trong cấu hình.";
    }
    if (isOverload(error.status)) {
      return "Gemini đang quá tải kéo dài (lỗi máy chủ của Google, không phải do bạn). Hãy thử lại sau vài phút, hoặc đổi GEMINI_MODEL sang gemini-3.5-flash-lite trong .env.local.";
    }
    return error.message;
  }
  return error instanceof Error ? error.message : String(error);
}

const OVERLOAD_WAITS_MS = [20_000, 40_000, 60_000];

function isOverload(status: number): boolean {
  return status === 500 || status === 503 || status === 504;
}

async function ask(
  deps: AiDataDeps,
  prompt: string,
): Promise<{ text: string; finishReason: string }> {
  const request = { apiKey: deps.apiKey, model: deps.model, prompt };
  let overloadRetries = 0;
  let rateRetried = false;
  for (;;) {
    try {
      return await generateJson(request);
    } catch (error) {
      if (error instanceof GeminiError && error.status === 429 && !rateRetried) {
        rateRetried = true;
        deps.report("Chạm giới hạn tốc độ, chờ 65 giây rồi thử lại một lần...");
        await sleep(RATE_WAIT_MS);
        continue;
      }
      if (
        error instanceof GeminiError &&
        isOverload(error.status) &&
        overloadRetries < OVERLOAD_WAITS_MS.length
      ) {
        const wait = OVERLOAD_WAITS_MS[overloadRetries] ?? 60_000;
        overloadRetries += 1;
        deps.report(
          `Gemini đang quá tải, chờ ${wait / 1000} giây rồi thử lại (lần ${overloadRetries}/${OVERLOAD_WAITS_MS.length})...`,
        );
        await sleep(wait);
        continue;
      }
      throw new AiDataError(describe(error));
    }
  }
}

export async function runAiData(
  input: AiDataInput,
  deps: AiDataDeps,
): Promise<AiDataResult> {
  deps.report("AI 1: đang đọc chữ trong báo cáo PDF...");
  const source = await extractSource(input.bytes, input.pages);
  deps.report(
    `AI 1: đã đọc ${source.pageCount} trang (khoảng ${source.estimatedTokens.toLocaleString("en-US")} token).`,
  );

  const survey = selectSurvey(deps.survey, {
    industry: input.industry,
    headcount: input.headcount,
  });
  const header = { name: input.name, year: input.year };
  const parts: Part[] = input.split
    ? [
        { tag: "ho-so", prompt: companyPrompt(header) },
        ...survey.map((pillar) => ({
          tag: pillar.id,
          prompt: pillarPrompt(header, pillar.name, groupQuestions(survey, pillar.id)),
        })),
      ]
    : [{ tag: "all", prompt: fullPrompt(header, survey) }];

  const results: AiResult[] = [];
  for (const [index, part] of parts.entries()) {
    if (index > 0) {
      deps.report("Chờ 65 giây để không vượt giới hạn mỗi phút...");
      await sleep(RATE_WAIT_MS);
    }
    deps.report(
      `AI 1: đang đọc và trả lời câu hỏi (${index + 1}/${parts.length}), có thể mất 1 đến 3 phút...`,
    );
    const answer = await ask(
      deps,
      `${part.prompt}\n\n=== TÀI LIỆU NGUỒN (mỗi trang bắt đầu bằng [Trang N]) ===\n${source.text}`,
    );
    try {
      results.push(aiResultSchema.parse(extractJson(answer.text)));
    } catch {
      throw new AiDataError(
        answer.finishReason === "MAX_TOKENS"
          ? "AI trả lời quá dài nên bị cắt. Hãy bật tùy chọn chia nhỏ rồi chạy lại."
          : "AI trả về kết quả không đúng định dạng. Hãy chạy lại, hoặc bật tùy chọn chia nhỏ.",
      );
    }
  }

  deps.report("AI 2: đang kiểm tra từng câu với tài liệu và tạo bản nháp...");
  const pages = parseSourceText(source.text);
  const built = buildDraft({
    results,
    survey,
    pages: pages.length === 0 ? null : pages,
    sourceLabel: input.sourceLabel,
    name: input.name,
    industry: input.industry,
    headcount: input.headcount,
    year: input.year,
  });

  return {
    content: built.content,
    company: built.company,
    answers: built.answers,
    defaults: built.defaults,
    rejected: built.rejected,
    totalQuestions: built.totalQuestions,
    verifiedCount: built.verifiedCount,
    verifyOn: pages.length > 0,
    pageCount: source.pageCount,
    sourceLabel: input.sourceLabel,
  };
}
