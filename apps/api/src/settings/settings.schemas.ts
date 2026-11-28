import { FEEDBACK_INVITE_DELAY_LIMITS } from "@esg/shared/node";
import { z } from "zod";

export const SETTING_KEYS = {
  feedbackInviteDelayDays: "feedback.invite_delay_days",
  inquiryNotifyEmail: "inquiry.notify_email",
} as const;

export const settingsPatchSchema = z
  .object({
    feedbackInviteDelayDays: z
      .number()
      .int()
      .min(FEEDBACK_INVITE_DELAY_LIMITS.min)
      .max(FEEDBACK_INVITE_DELAY_LIMITS.max)
      .nullable()
      .optional(),
    inquiryNotifyEmail: z.string().trim().toLowerCase().max(120).pipe(z.email()).nullable().optional(),
  })
  .strict();

export type SettingsPatch = z.infer<typeof settingsPatchSchema>;
