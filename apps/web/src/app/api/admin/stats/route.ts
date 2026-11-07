import { flattenIssues, statsInputSchema } from "@esg/shared";
import { NextResponse } from "next/server";

import { clearContentCache } from "@/features/about/lib/content";
import { callAbout } from "@/server/about/bridge";
import {
  bridgeErrorResponse,
  jsonError,
  readJson,
} from "@/server/admin/api-helpers";
import { requireAdminApi } from "@/server/admin/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const denied = await requireAdminApi();
  if (denied) {
    return denied;
  }
  const parsed = statsInputSchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return jsonError(
      400,
      "Dữ liệu chưa hợp lệ. Vui lòng kiểm tra các mục được đánh dấu.",
      flattenIssues(parsed.error),
    );
  }
  try {
    await callAbout("saveStats", { items: parsed.data.items });
    clearContentCache();
    return NextResponse.json({ ok: true });
  } catch (error) {
    return bridgeErrorResponse(error);
  }
}
