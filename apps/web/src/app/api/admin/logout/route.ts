import { NextResponse } from "next/server";

import { endSession } from "@/server/admin/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  await endSession();
  return NextResponse.json({ ok: true });
}
