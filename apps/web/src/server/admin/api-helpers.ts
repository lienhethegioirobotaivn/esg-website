import "server-only";

import { NextResponse } from "next/server";

import { CompanyBridgeError } from "../company/save-company";

export function jsonError(
  status: number,
  message: string,
  fields: Record<string, string> = {},
) {
  return NextResponse.json({ error: { message, fields } }, { status });
}

export function bridgeErrorResponse(error: unknown) {
  if (error instanceof CompanyBridgeError) {
    console.error(error.message);
    if (error.kind === "not-configured") {
      return jsonError(503, "Chưa cấu hình kết nối Google Apps Script.");
    }
    return jsonError(502, error.message);
  }
  console.error(error);
  return jsonError(500, "Có lỗi xảy ra. Vui lòng thử lại sau.");
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}
