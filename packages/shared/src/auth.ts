import { z } from "zod";

import { REPORT_ARCHIVE_LOCALES } from "./report-archive";

export const EMAIL_OTP_RULES = {
  codeLength: 6,
  ttlSeconds: 600,
  maxTries: 5,
  resendSeconds: 60,
  perEmailPerHour: 3,
  dailyLimit: 60,
  sessionDays: 30,
  maxEmailLength: 254,
} as const;

export const EXPORT_ID_PATTERN = /^RX-\d{8}-[A-Z0-9]{6}$/;

export const emailAddressSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email().max(EMAIL_OTP_RULES.maxEmailLength));

export const emailOtpRequestSchema = z.object({
  email: emailAddressSchema,
  locale: z.enum(REPORT_ARCHIVE_LOCALES),
});

export const emailOtpVerifySchema = z.object({
  email: emailAddressSchema,
  code: z.string().regex(new RegExp(`^\\d{${EMAIL_OTP_RULES.codeLength}}$`)),
});

export const reportAttachSchema = z.object({
  exportId: z.string().regex(EXPORT_ID_PATTERN),
  attachToken: z.string().min(10).max(300),
});

export type EmailOtpRequestInput = z.infer<typeof emailOtpRequestSchema>;
export type EmailOtpVerifyInput = z.infer<typeof emailOtpVerifySchema>;
export type ReportAttachInput = z.infer<typeof reportAttachSchema>;

export function maskEmail(email: string): string {
  const at = email.lastIndexOf("@");
  if (at < 1) {
    return email;
  }
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  const visible = local.length <= 2 ? local.slice(0, 1) : local.slice(0, 2);
  return `${visible}${"*".repeat(Math.max(local.length - visible.length, 1))}@${domain}`;
}
