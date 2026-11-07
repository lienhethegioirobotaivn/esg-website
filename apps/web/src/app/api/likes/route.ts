import { likeInputSchema } from "@esg/shared";
import { NextResponse } from "next/server";

import { clearContentCache } from "@/features/about/lib/content";
import { callAbout, isAboutBridgeConfigured } from "@/server/about/bridge";
import {
  bridgeErrorResponse,
  jsonError,
  readJson,
} from "@/server/admin/api-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const parsed = likeInputSchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return jsonError(400, "Dữ liệu không hợp lệ.");
  }
  if (!isAboutBridgeConfigured()) {
    return jsonError(503, "Chưa cấu hình kết nối lưu dữ liệu.");
  }
  try {
    const response = await callAbout("likePost", parsed.data);
    clearContentCache();
    return NextResponse.json({ ok: true, likes: response["likes"] });
  } catch (error) {
    return bridgeErrorResponse(error);
  }
}
