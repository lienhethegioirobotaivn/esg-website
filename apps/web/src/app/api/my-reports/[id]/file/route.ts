import { myReportFormatSchema } from "@esg/shared";

import { msg } from "@/features/locale/lib/translate";
import {
  MY_REPORTS_DAILY_LIMIT,
  MY_REPORTS_IP_LIMIT,
  myReportsReadWindow,
} from "@/server/my-reports/limits";
import {
  contentDisposition,
  openOwnerFile,
  ownerErrorResponse,
  ownerFail,
  parseExportId,
  requireOwner,
} from "@/server/my-reports/owner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface RouteContext {
  readonly params: Promise<{ id: string }>;
}

const CONTENT_TYPES = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
} as const;

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
  const format = myReportFormatSchema.safeParse(
    new URL(request.url).searchParams.get("format"),
  );
  if (!format.success) {
    return ownerFail(400, msg("Định dạng file không hợp lệ."));
  }
  try {
    const exportId = parseExportId((await context.params).id);
    const file = await openOwnerFile(owner.email, exportId, format.data);
    return new Response(file.stream, {
      headers: {
        "Content-Type": CONTENT_TYPES[format.data],
        "Content-Length": String(file.size),
        "Content-Disposition": contentDisposition(file.name),
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return ownerErrorResponse(error);
  }
}
