import {
  MY_REPORTS_DAILY_LIMIT,
  MY_REPORTS_IP_LIMIT,
  myReportsReadWindow,
} from "@/server/my-reports/limits";
import {
  listOwnerReports,
  ownerErrorResponse,
  ownerJson,
  requireOwner,
} from "@/server/my-reports/owner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
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
    const reports = await listOwnerReports(owner.email);
    return ownerJson({ email: owner.email, reports });
  } catch (error) {
    return ownerErrorResponse(error);
  }
}
