import { timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";

import { getServerEnv } from "@/server/env";
import { pruneUnusedTranslations, warmAllLocales } from "@/server/translation/warm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const WARM_BUDGET_MS = 40_000;

function isAuthorized(request: Request, secret: string): boolean {
  const header = request.headers.get("authorization") ?? "";
  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(header);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

async function handle(request: Request) {
  const secret = getServerEnv().CRON_SECRET;
  if (secret === undefined) {
    return NextResponse.json({ ok: false, message: "Chưa cấu hình CRON_SECRET." }, { status: 503 });
  }
  if (!isAuthorized(request, secret)) {
    return NextResponse.json({ ok: false, message: "Không có quyền." }, { status: 401 });
  }
  try {
    const result = await warmAllLocales(WARM_BUDGET_MS);
    const shouldPrune = new URL(request.url).searchParams.get("prune") === "1";
    const pruned = shouldPrune && result.done ? await pruneUnusedTranslations() : null;
    const remaining = Object.values(result.locales).reduce(
      (sum, item) => sum + item.remaining,
      0,
    );
    return NextResponse.json({
      ok: true,
      done: result.done,
      remaining,
      locales: result.locales,
      pruned,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ ok: false, message: "Không dịch sẵn được." }, { status: 502 });
  }
}

export const GET = handle;
export const POST = handle;
