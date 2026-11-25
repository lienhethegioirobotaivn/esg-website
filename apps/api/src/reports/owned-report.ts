import { and, eq } from "drizzle-orm";

import { AppError } from "../common/app-error.js";
import type { Database } from "../database/client.js";
import { reports } from "../database/schema/index.js";

export interface OwnedReport {
  id: string;
  bankVersionId: string;
}

export async function requireOwnedReport(
  db: Pick<Database, "select">,
  code: string,
  userId: string,
): Promise<OwnedReport> {
  const [row] = await db
    .select({ id: reports.id, bankVersionId: reports.bankVersionId })
    .from(reports)
    .where(and(eq(reports.code, code), eq(reports.ownerUserId, userId)))
    .limit(1);
  if (row === undefined) {
    throw new AppError(404, "report_not_found", "Không tìm thấy báo cáo này trong tài khoản của bạn.");
  }
  return row;
}
