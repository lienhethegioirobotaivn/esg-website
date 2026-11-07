import { NextResponse } from "next/server";
import { z } from "zod";

import { jsonError, readJson } from "@/server/admin/api-helpers";
import {
  checkAttempts,
  clearFailures,
  isAdminConfigured,
  recordFailure,
  startSession,
  verifyPassword,
} from "@/server/admin/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({ password: z.string().min(1).max(200) });

function clientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || "local";
}

export async function POST(request: Request) {
  if (!isAdminConfigured()) {
    return jsonError(503, "Chưa cấu hình ADMIN_PASSWORD trên máy chủ.");
  }
  const key = clientKey(request);
  if (!checkAttempts(key)) {
    return jsonError(429, "Nhập sai quá nhiều lần. Vui lòng thử lại sau 15 phút.");
  }
  const parsed = bodySchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return jsonError(400, "Vui lòng nhập mật khẩu.");
  }
  if (!verifyPassword(parsed.data.password)) {
    recordFailure(key);
    await new Promise((resolve) => setTimeout(resolve, 600));
    return jsonError(401, "Mật khẩu không đúng.");
  }
  clearFailures(key);
  await startSession();
  return NextResponse.json({ ok: true });
}
