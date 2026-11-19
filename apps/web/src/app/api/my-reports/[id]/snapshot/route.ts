import {
  MY_REPORTS_DAILY_LIMIT,
  MY_REPORTS_IP_LIMIT,
  myReportsReadWindow,
} from "@/server/my-reports/limits";
import {
  fetchOwnerSnapshot,
  ownerErrorResponse,
  ownerJson,
  parseExportId,
  requireOwner,
} from "@/server/my-reports/owner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteContext {
  readonly params: Promise<{ id: string }>;
}

export async function GET(request: Request, context: RouteContext) {
  const owner = await requireOwner(
    request,
    myReportsReadWindow(),
    MY_REPORTS_IP_LIMIT,
    MY_REPORTS_DAILY_LIMIT,
  );
  if ("response" in owner) {
    return owner.response;
  }
  try {
    const exportId = parseExportId((await context.params).id);
    return ownerJson(await fetchOwnerSnapshot(owner.email, exportId));
  } catch (error) {
    return ownerErrorResponse(error);
  }
}
