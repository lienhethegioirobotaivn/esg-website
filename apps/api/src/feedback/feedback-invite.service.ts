import { Inject, Injectable } from "@nestjs/common";
import { and, desc, eq, gte, lte, notExists, sql } from "drizzle-orm";

import { APP_ENV } from "../config/config.constants.js";
import type { AppEnv } from "../config/env.schema.js";
import type { Database } from "../database/client.js";
import { DATABASE } from "../database/database.constants.js";
import { feedbacks, reportExports, reports, users } from "../database/schema/index.js";
import { MailService } from "../mail/mail.service.js";
import { SettingsService } from "../settings/settings.service.js";
import { FEEDBACK_INVITE_BATCH, FEEDBACK_INVITE_MAX_AGE_DAYS } from "./feedback.constants.js";
import { FeedbackService } from "./feedback.service.js";

const DAY_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class FeedbackInviteService {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    @Inject(MailService) private readonly mail: MailService,
    @Inject(FeedbackService) private readonly feedback: FeedbackService,
    @Inject(APP_ENV) private readonly env: AppEnv,
    @Inject(SettingsService) private readonly settings: SettingsService,
  ) {}

  async sendDue(now: number = Date.now()): Promise<{ invited: number }> {
    const { feedbackInviteDelayDays } = await this.settings.read();
    const ready = new Date(now - feedbackInviteDelayDays * DAY_MS);
    const oldest = new Date(now - FEEDBACK_INVITE_MAX_AGE_DAYS * DAY_MS);

    const candidates = await this.db
      .select({
        reportId: reports.id,
        reportCode: reports.code,
        email: users.email,
      })
      .from(reports)
      .innerJoin(users, eq(users.id, reports.ownerUserId))
      .where(
        and(
          eq(reports.status, "exported"),
          lte(reports.lastExportAt, ready),
          gte(reports.lastExportAt, oldest),
          notExists(
            this.db
              .select({ one: sql`1` })
              .from(feedbacks)
              .where(and(eq(feedbacks.reportId, reports.id), eq(feedbacks.kind, "invite"))),
          ),
        ),
      )
      .orderBy(reports.lastExportAt)
      .limit(FEEDBACK_INVITE_BATCH);

    let invited = 0;
    for (const candidate of candidates) {
      const [latestExport] = await this.db
        .select({ locale: reportExports.locale })
        .from(reportExports)
        .where(eq(reportExports.reportId, candidate.reportId))
        .orderBy(desc(reportExports.createdAt))
        .limit(1);
      const { token, tokenHash } = this.feedback.newInviteToken();

      const created = await this.db.transaction(async (tx) => {
        const rows = await tx
          .insert(feedbacks)
          .values({
            kind: "invite",
            reportId: candidate.reportId,
            email: candidate.email,
            tokenHash,
            inviteSentAt: new Date(now),
          })
          .onConflictDoNothing()
          .returning({ id: feedbacks.id });
        if (rows[0] === undefined) {
          return false;
        }
        await this.mail.enqueue(
          {
            to: candidate.email,
            template: "feedback_invite",
            payload: {
              url: `${this.env.PUBLIC_BASE_URL.replace(/\/$/, "")}/feedback?token=${token}`,
              reportCode: candidate.reportCode,
              locale: latestExport?.locale ?? "vi",
            },
          },
          tx,
        );
        return true;
      });
      if (created) {
        invited += 1;
      }
    }
    return { invited };
  }
}
