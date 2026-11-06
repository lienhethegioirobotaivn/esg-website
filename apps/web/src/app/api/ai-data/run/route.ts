import { HEADCOUNT_TIERS, INDUSTRY_SOURCES } from "@esg/shared";
import { NextResponse } from "next/server";
import { z } from "zod";

import type { StreamEvent } from "@/features/ai-data/types";
import { AiDataError, runAiData } from "@/server/ai-data/run-ai-data";
import { SourceError, assertPdfBytes, downloadPdf } from "@/server/ai-data/pdf";
import { getServerEnv } from "@/server/env";
import { getSurveyBank } from "@/server/survey-bank/get-survey-bank";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const formSchema = z.object({
  name: z.string().trim().min(1, "Hãy nhập tên doanh nghiệp."),
  industry: z.string().refine((value) => value in INDUSTRY_SOURCES, "Hãy chọn lĩnh vực."),
  headcount: z.string().refine((value) => value in HEADCOUNT_TIERS, "Hãy chọn quy mô nhân sự."),
  year: z.string().regex(/^\d{4}$/, "Năm báo cáo gồm 4 chữ số."),
  url: z.string().trim(),
  pages: z.string().trim(),
  split: z.string(),
});

function fail(status: number, message: string) {
  return NextResponse.json({ error: { message } }, { status });
}

function field(form: FormData, key: string): string {
  const value = form.get(key);
  return typeof value === "string" ? value : "";
}

export async function POST(request: Request) {
  const env = getServerEnv();
  if (!env.ENABLE_AI_TOOLS) {
    return fail(404, "Không tìm thấy.");
  }
  if (env.GEMINI_API_KEY === undefined) {
    return fail(503, "Chưa cấu hình GEMINI_API_KEY trong file .env.local.");
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return fail(400, "Dữ liệu gửi lên không hợp lệ.");
  }

  const parsed = formSchema.safeParse({
    name: field(form, "name"),
    industry: field(form, "industry"),
    headcount: field(form, "headcount"),
    year: field(form, "year"),
    url: field(form, "url"),
    pages: field(form, "pages"),
    split: field(form, "split"),
  });
  if (!parsed.success) {
    return fail(400, parsed.error.issues[0]?.message ?? "Thông tin chưa hợp lệ.");
  }
  const values = parsed.data;

  const file = form.get("file");
  const uploaded = file instanceof File && file.size > 0 ? file : null;
  if (uploaded === null && values.url === "") {
    return fail(400, "Hãy dán đường dẫn PDF hoặc chọn tệp PDF từ máy.");
  }

  const apiKey = env.GEMINI_API_KEY;
  const model = env.GEMINI_MODEL;
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      function send(event: StreamEvent) {
        controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      }
      try {
        send({ type: "step", message: "Đang lấy bộ câu hỏi và tệp báo cáo..." });
        const survey = await getSurveyBank();
        let bytes: Uint8Array;
        if (uploaded !== null) {
          bytes = new Uint8Array(await uploaded.arrayBuffer());
          assertPdfBytes(bytes);
        } else {
          bytes = await downloadPdf(values.url);
        }
        const result = await runAiData(
          {
            name: values.name,
            industry: values.industry,
            headcount: values.headcount,
            year: values.year,
            pages: values.pages === "" ? undefined : values.pages,
            split: values.split === "true",
            bytes,
            sourceLabel: uploaded !== null ? uploaded.name : values.url,
          },
          {
            survey,
            apiKey,
            model,
            report: (message) => send({ type: "step", message }),
          },
        );
        send({ type: "done", result });
      } catch (error) {
        if (error instanceof AiDataError || error instanceof SourceError) {
          send({ type: "error", message: error.message });
        } else {
          console.error(error);
          send({ type: "error", message: "Có lỗi không xác định khi chạy AI." });
        }
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
