import { NextResponse } from "next/server";

import { endUserSession } from "@/server/auth/user-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  await endUserSession();
  return NextResponse.json({ ok: true });
}
