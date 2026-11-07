import { NextResponse } from "next/server";

import { clearContentCache } from "@/features/about/lib/content";
import { callAbout } from "@/server/about/bridge";
import { bridgeErrorResponse } from "@/server/admin/api-helpers";
import { requireAdminApi } from "@/server/admin/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
    return NextResponse.json({ ok: true });
  } catch (error) {
    return bridgeErrorResponse(error);
  }
}
