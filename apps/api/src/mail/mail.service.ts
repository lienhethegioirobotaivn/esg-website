import { Inject, Injectable, Logger } from "@nestjs/common";
import { and, asc, eq, lte, sql } from "drizzle-orm";

import { AppError } from "../common/app-error.js";
import { APP_ENV } from "../config/config.constants.js";
import type { AppEnv } from "../config/env.schema.js";
import type { Database } from "../database/client.js";
import { DATABASE } from "../database/database.constants.js";
import { emailOutbox } from "../database/schema/index.js";
import { MAIL_PROVIDER, MailSendError, type MailProvider } from "./mail-provider.js";
import { findTemplate, type MailTemplateName } from "./mail-templates.js";
import { OUTBOX_LEASE_SECONDS, otpReserve, retryDelaySeconds } from "./retry-policy.js";

export type MailExecutor = Pick<Database, "insert">;

export interface EnqueueInput {
  to: string;
  template: MailTemplateName;
  payload: Record<string, unknown>;
}

export type DeliveryOutcome = "sent" | "failed" | "retry" | "skipped";

export interface DeliverySummary {
  sent: number;
  failed: number;
  retry: number;
  skipped: number;
}

const WARN_RATIO = 0.8;
const DUE_BATCH = 50;
const ERROR_MAX_LENGTH = 500;

@Injectable()
export class MailService {
  private readonly logger = new Logger("Mail");

  constructor(
    @Inject(DATABASE) private readonly db: Database,
    @Inject(MAIL_PROVIDER) private readonly provider: MailProvider,
    @Inject(APP_ENV) private readonly env: AppEnv,
  ) {}

  async enqueue(input: EnqueueInput, executor: MailExecutor = this.db): Promise<string> {
    if (findTemplate(input.template) === undefined) {
      throw new Error(`Mẫu thư không tồn tại: ${input.template}`);
    }
    const [row] = await executor
      .insert(emailOutbox)
      .values({ toEmail: input.to, template: input.template, payload: input.payload })
      .returning({ id: emailOutbox.id });
    if (row === undefined) {
      throw new Error("Không ghi được thư vào hộp thư đi");
    }
    return row.id;
  }

  async sentInLast24Hours(): Promise<number> {
    const result = await this.db
      .select({ total: sql<number>`count(*)::int` })
      .from(emailOutbox)
      .where(
        and(eq(emailOutbox.status, "sent"), sql`${emailOutbox.sentAt} > now() - interval '24 hours'`),
      );
    return result[0]?.total ?? 0;
  }

  async assertCanSendOtp(): Promise<void> {
    const used = await this.sentInLast24Hours();
    const limit = this.env.MAIL_DAILY_LIMIT;
    if (used >= limit) {
      throw new AppError(
        503,
        "mail_daily_limit",
        "Hệ thống tạm thời chưa gửi thêm được mã xác nhận. Vui lòng thử lại vào ngày mai.",
      );
    }
    if (used >= limit * WARN_RATIO) {
      this.logger.warn(`Đã gửi ${used}/${limit} thư trong 24 giờ qua, sắp chạm hạn mức nhà cung cấp`);
    }
  }

  async deliver(id: string): Promise<DeliveryOutcome> {
    const claimed = await this.db
      .update(emailOutbox)
      .set({
        attempts: sql`${emailOutbox.attempts} + 1`,
        nextAttemptAt: sql`now() + interval '1 second' * ${OUTBOX_LEASE_SECONDS}`,
      })
      .where(
        and(
          eq(emailOutbox.id, id),
          eq(emailOutbox.status, "pending"),
          lte(emailOutbox.nextAttemptAt, sql`now()`),
        ),
      )
      .returning();

    const row = claimed[0];
    if (row === undefined) {
      return "skipped";
    }

    const template = findTemplate(row.template);
    if (template === undefined) {
      await this.markFailed(row.id, `Mẫu thư không tồn tại: ${row.template}`, true);
      return "failed";
    }

    try {
      await this.provider.send(template.render(row.payload, row.toEmail));
    } catch (error) {
      const retryable = error instanceof MailSendError && error.retryable;
      const reason = error instanceof Error ? error.message : "lỗi không rõ";
      if (!retryable || row.attempts >= template.maxAttempts) {
        await this.markFailed(row.id, reason, template.scrubPayloadAfterSend);
        return "failed";
      }
      await this.db
        .update(emailOutbox)
        .set({
          error: reason.slice(0, ERROR_MAX_LENGTH),
          nextAttemptAt: sql`now() + interval '1 second' * ${retryDelaySeconds(row.attempts)}`,
        })
        .where(eq(emailOutbox.id, row.id));
      return "retry";
    }

    await this.db
      .update(emailOutbox)
      .set({
        status: "sent",
        sentAt: sql`now()`,
        error: null,
        ...(template.scrubPayloadAfterSend ? { payload: {} } : {}),
      })
      .where(eq(emailOutbox.id, row.id));
    return "sent";
  }

  async deliverDue(): Promise<DeliverySummary> {
    const summary: DeliverySummary = { sent: 0, failed: 0, retry: 0, skipped: 0 };
    const due = await this.db
      .select({ id: emailOutbox.id, template: emailOutbox.template })
      .from(emailOutbox)
      .where(and(eq(emailOutbox.status, "pending"), lte(emailOutbox.nextAttemptAt, sql`now()`)))
      .orderBy(asc(emailOutbox.nextAttemptAt))
      .limit(DUE_BATCH);
    if (due.length === 0) {
      return summary;
    }

    const ordered = [...due].sort(
      (a, b) => priorityRank(a.template) - priorityRank(b.template),
    );
    let remaining = this.env.MAIL_DAILY_LIMIT - (await this.sentInLast24Hours());
    const reserve = otpReserve(this.env.MAIL_DAILY_LIMIT);

    for (const item of ordered) {
      const high = findTemplate(item.template)?.priority === "high";
      const allowed = high ? remaining > 0 : remaining > reserve;
      if (!allowed) {
        summary.skipped += 1;
        continue;
      }
      const outcome = await this.deliver(item.id);
      summary[outcome] += 1;
      if (outcome === "sent") {
        remaining -= 1;
      }
    }
    return summary;
  }

  private async markFailed(id: string, reason: string, scrub: boolean): Promise<void> {
    await this.db
      .update(emailOutbox)
      .set({
        status: "failed",
        error: reason.slice(0, ERROR_MAX_LENGTH),
        ...(scrub ? { payload: {} } : {}),
      })
      .where(eq(emailOutbox.id, id));
    this.logger.warn(`Gửi thư thất bại (${id}): ${reason}`);
  }
}

function priorityRank(templateName: string): number {
  return findTemplate(templateName)?.priority === "high" ? 0 : 1;
}
