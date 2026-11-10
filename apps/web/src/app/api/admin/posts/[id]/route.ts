import { NextResponse } from "next/server";

import { clearContentCache } from "@/features/about/lib/content";
import { callAbout } from "@/server/about/bridge";
import { bridgeErrorResponse } from "@/server/admin/api-helpers";
import { requireAdminApi } from "@/server/admin/session";
import { scheduleTranslationMaintenance } from "@/server/translation/warm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const denied = await requireAdminApi();
  if (denied) {
    return denied;
  }
  const { id } = await context.params;
  try {
    await callAbout("deletePost", { id });
    clearContentCache();
    scheduleTranslationMaintenance();
    return NextResponse.json({ ok: true });
  } catch (error) {
    return bridgeErrorResponse(error);
  }
}
