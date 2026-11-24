import { Inject, Injectable } from "@nestjs/common";
import { sql } from "drizzle-orm";

import type { Database } from "../database/client.js";
import { DATABASE } from "../database/database.constants.js";

@Injectable()
export class CleanupService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async otpChallenges(): Promise<number> {
    return this.count(sql`
      delete from otp_challenges
      where expires_at < now() - interval '1 day'
         or consumed_at < now() - interval '1 day'
    `);
  }

  async sessions(): Promise<number> {
    const users = await this.count(sql`delete from user_sessions where expires_at < now()`);
    const admins = await this.count(sql`delete from admin_sessions where expires_at < now()`);
    return users + admins;
  }

  async rateLimits(): Promise<number> {
    return this.count(sql`delete from rate_limits where window_start < now() - interval '2 days'`);
  }

  async sentEmails(): Promise<number> {
    return this.count(sql`
      delete from email_outbox
      where status = 'sent' and sent_at < now() - interval '30 days'
    `);
  }

  private async count(query: ReturnType<typeof sql>): Promise<number> {
    const result = await this.db.execute(query);
    return result.rowCount ?? 0;
  }
}
