import { NextResponse } from "next/server";

import { bridgeErrorResponse, jsonError, readJson } from "@/server/admin/api-helpers";
import { requireAdminApi } from "@/server/admin/session";
import { pruneUnusedTranslations, warmLocale } from "@/server/translation/warm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const WARM_BUDGET_MS = 40_000;

export async function POST(request: Request) {
  const denied = await requireAdminApi();
  if (denied) {
    return denied;
  }
  const body = await readJson(request);
  const record =
    typeof body === "object" && body !== null
      ? (body as Record<string, unknown>)
      : {};
  if (record["prune"] === true) {
    try {
      const pruned = await pruneUnusedTranslations();
      return NextResponse.json({
        ok: true,
        removed: pruned?.removed ?? 0,
        keptManual: pruned?.keptManual ?? 0,
      });
    } catch (error) {
      return bridgeErrorResponse(error);
    }
  }
  const locale = record["locale"];
  if (locale !== "en" && locale !== "fr" && locale !== "zh") {
    return jsonError(400, "Ngôn ngữ không hợp lệ.");
  }
  try {
    const result = await warmLocale(locale, WARM_BUDGET_MS);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return bridgeErrorResponse(error);
  }
}
