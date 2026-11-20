import {
  MY_REPORTS_DAILY_LIMIT,
  MY_REPORTS_DELETE_IP_LIMIT,
  myReportsDeleteWindow,
} from "@/server/my-reports/limits";
import {
  ownerErrorResponse,
  ownerJson,
  parseExportId,
  removeOwnerReport,
  requireOwner,
} from "@/server/my-reports/owner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteContext {
  readonly params: Promise<{ id: string }>;
}

export async function DELETE(request: Request, context: RouteContext) {
  const owner = await requireOwner(
    request,
    myReportsDeleteWindow(),
    MY_REPORTS_DELETE_IP_LIMIT,
    MY_REPORTS_DAILY_LIMIT,
  );
  if ("response" in owner) {
    return owner.response;
  }
  try {
    const exportId = parseExportId((await context.params).id);
    await removeOwnerReport(owner.email, exportId);
    return ownerJson({ ok: true });
  } catch (error) {
    return ownerErrorResponse(error);
  }
}
