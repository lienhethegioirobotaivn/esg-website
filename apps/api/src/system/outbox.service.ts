import type { OutboxItem, OutboxList } from "@esg/shared/node";
import { Inject, Injectable } from "@nestjs/common";
import { and, desc, eq, sql } from "drizzle-orm";

import type { AdminIdentity } from "../admin/admin.types.js";
import { AuditService } from "../audit/audit.service.js";
import { AppError } from "../common/app-error.js";
import type { Database } from "../database/client.js";
import { DATABASE } from "../database/database.constants.js";
import { emailOutbox, type EmailStatus } from "../database/schema/index.js";

type OutboxRow = typeof emailOutbox.$inferSelect;

function hasPayload(row: OutboxRow): boolean {
  return Object.keys(row.payload).length > 0;
}

function toItem(row: OutboxRow): OutboxItem {
  return {
    id: row.id,
    toEmail: row.toEmail,
    template: row.template,
    status: row.status,
    attempts: row.attempts,
    error: row.error,
    createdAt: row.createdAt.toISOString(),
    sentAt: row.sentAt?.toISOString() ?? null,
    nextAttemptAt: row.nextAttemptAt.toISOString(),
    canRetry: row.status === "failed" && hasPayload(row),
  };
}

@Injectable()
export class OutboxService {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  async list(query: { status: EmailStatus; limit: number; offset: number }): Promise<OutboxList> {
    const rows = await this.db
      .select()
      .from(emailOutbox)
      .where(eq(emailOutbox.status, query.status))
      .orderBy(desc(emailOutbox.createdAt), desc(emailOutbox.id))
      .limit(query.limit)
      .offset(query.offset);
    const grouped = await this.db
      .select({ status: emailOutbox.status, total: sql<number>`count(*)::int` })
      .from(emailOutbox)
      .groupBy(emailOutbox.status);
    const counts = { pending: 0, sent: 0, failed: 0 };
    for (const group of grouped) {
      counts[group.status] = group.total;
    }
    return { items: rows.map(toItem), total: counts[query.status], counts };
  }

  async retry(id: string, admin: AdminIdentity, ip: string): Promise<void> {
    await this.db.transaction(async (tx) => {
      const row = await this.lockFailed(tx, id);
      if (!hasPayload(row)) {
        throw new AppError(
          409,
          "cannot_retry",
          "Thư này chứa mã bảo mật đã được xóa nên không gửi lại được. Người nhận cần yêu cầu mã mới.",
        );
      }
      await tx
        .update(emailOutbox)
        .set({
          status: "pending",
          attempts: 0,
          error: null,
          nextAttemptAt: sql`now()`,
          updatedAt: sql`now()`,
        })
        .where(eq(emailOutbox.id, id));
      await this.record(tx, "email.retry", id, admin, ip);
    });
  }

  async remove(id: string, admin: AdminIdentity, ip: string): Promise<void> {
    await this.db.transaction(async (tx) => {
      await this.lockFailed(tx, id);
      await tx
        .delete(emailOutbox)
        .where(and(eq(emailOutbox.id, id), eq(emailOutbox.status, "failed")));
      await this.record(tx, "email.delete", id, admin, ip);
    });
  }

  private async lockFailed(db: Pick<Database, "select">, id: string): Promise<OutboxRow> {
    const [row] = await db.select().from(emailOutbox).where(eq(emailOutbox.id, id)).for("update");
    if (row === undefined) {
      throw new AppError(404, "not_found", "Không tìm thấy thư.");
    }
    if (row.status !== "failed") {
      throw new AppError(409, "not_failed", "Chỉ thao tác được với thư gửi lỗi.");
    }
    return row;
  }

  private record(
    executor: Pick<Database, "insert">,
    action: string,
    id: string,
    admin: AdminIdentity,
    ip: string,
  ): Promise<void> {
    return this.audit.record(
      {
        actorType: "admin",
        actorId: admin.adminId,
        action,
        entity: "email_outbox",
        entityId: id,
        ip,
      },
      executor,
    );
  }
}
