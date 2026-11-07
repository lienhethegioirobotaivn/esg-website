import { NextResponse } from "next/server";

import { CompanyBridgeError } from "@/server/company/save-company";
import {
  ContactInputError,
  submitFeedback,
  submitInquiry,
} from "@/server/contact/submit-contact";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function errorResponse(
  status: number,
  message: string,
  fields: Record<string, string> = {},
) {
  return NextResponse.json({ error: { message, fields } }, { status });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse(400, "Dữ liệu gửi lên không hợp lệ.");
  }
  if (!isRecord(body)) {
    return errorResponse(400, "Dữ liệu gửi lên không hợp lệ.");
  }

  try {
    if (body["type"] === "feedback") {
      await submitFeedback(body);
    } else {
      await submitInquiry(body);
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof ContactInputError) {
      return errorResponse(400, error.message, error.fields);
    }
    if (error instanceof CompanyBridgeError) {
      console.error(error.message);
      return error.kind === "not-configured"
        ? errorResponse(503, "Chưa cấu hình kết nối lưu dữ liệu vào Google Sheet.")
        : errorResponse(502, "Không gửi được yêu cầu. Vui lòng thử lại sau.");
    }
    console.error(error);
    return errorResponse(500, "Không gửi được yêu cầu. Vui lòng thử lại sau.");
  }
}
