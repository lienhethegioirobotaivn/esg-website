import { NextResponse } from "next/server";

import { readSessionEmail } from "@/server/auth/user-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const email = await readSessionEmail();
  return NextResponse.json(
    { email },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
