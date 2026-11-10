import { postInputSchema, flattenIssues } from "@esg/shared";
import { NextResponse } from "next/server";

import { clearContentCache } from "@/features/about/lib/content";
import { callAbout } from "@/server/about/bridge";
import {
  bridgeErrorResponse,
  jsonError,
  readJson,
} from "@/server/admin/api-helpers";
import { requireAdminApi } from "@/server/admin/session";
import { scheduleTranslationMaintenance } from "@/server/translation/warm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  const denied = await requireAdminApi();
  if (denied) {
    return denied;
  }
  const parsed = postInputSchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return jsonError(
      400,
      "Dữ liệu chưa hợp lệ. Vui lòng kiểm tra các mục được đánh dấu.",
      flattenIssues(parsed.error),
    );
  }
  try {
    const response = await callAbout("savePost", { post: parsed.data });
    clearContentCache();
    scheduleTranslationMaintenance();
    return NextResponse.json({ ok: true, id: response["id"] });
  } catch (error) {
    return bridgeErrorResponse(error);
  }
}
