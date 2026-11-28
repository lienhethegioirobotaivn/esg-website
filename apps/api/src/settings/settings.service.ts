import type { AdminSettingsView } from "@esg/shared/node";
import { Inject, Injectable } from "@nestjs/common";
import { inArray, sql } from "drizzle-orm";

import { APP_ENV } from "../config/config.constants.js";
import type { AppEnv } from "../config/env.schema.js";
import type { Database } from "../database/client.js";
import { DATABASE } from "../database/database.constants.js";
import { settings } from "../database/schema/index.js";
import { FEEDBACK_INVITE_DELAY_DAYS } from "../feedback/feedback.constants.js";
import { SETTING_KEYS, settingsPatchSchema, type SettingsPatch } from "./settings.schemas.js";

type SettingsExecutor = Pick<Database, "insert" | "delete">;

@Injectable()
export class SettingsService {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    @Inject(APP_ENV) private readonly env: AppEnv,
  ) {}

  async read(): Promise<AdminSettingsView> {
    const rows = await this.db
      .select({ key: settings.key, value: settings.value })
      .from(settings)
      .where(inArray(settings.key, Object.values(SETTING_KEYS)));
    const stored = new Map(rows.map((row) => [row.key, row.value]));
    const delay = settingsPatchSchema.shape.feedbackInviteDelayDays.safeParse(
      stored.get(SETTING_KEYS.feedbackInviteDelayDays),
    );
    const email = settingsPatchSchema.shape.inquiryNotifyEmail.safeParse(
      stored.get(SETTING_KEYS.inquiryNotifyEmail),
    );
    return {
      feedbackInviteDelayDays: delay.data ?? FEEDBACK_INVITE_DELAY_DAYS,
      inquiryNotifyEmail: email.data ?? null,
      defaults: {
        feedbackInviteDelayDays: FEEDBACK_INVITE_DELAY_DAYS,
        inquiryNotifyEmail: this.env.ADMIN_NOTIFY_EMAIL ?? null,
      },
    };
  }

  async write(patch: SettingsPatch, executor: SettingsExecutor = this.db): Promise<void> {
    for (const [field, key] of Object.entries(SETTING_KEYS)) {
      const value = patch[field as keyof SettingsPatch];
      if (value === undefined) {
        continue;
      }
      if (value === null) {
        await executor.delete(settings).where(inArray(settings.key, [key]));
        continue;
      }
      await executor
        .insert(settings)
        .values({ key, value })
        .onConflictDoUpdate({ target: settings.key, set: { value, updatedAt: sql`now()` } });
    }
  }
}
