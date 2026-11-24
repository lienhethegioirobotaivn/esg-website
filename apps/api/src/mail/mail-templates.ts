import { z } from "zod";

import type { MailMessage } from "./mail-provider.js";

export const MAIL_LOCALES = ["vi", "en", "fr", "zh"] as const;
export type MailLocale = (typeof MAIL_LOCALES)[number];

export const OTP_TTL_MINUTES = 10;

export type MailPriority = "high" | "normal";

export interface MailTemplate {
  readonly maxAttempts: number;
  readonly priority: MailPriority;
  readonly scrubPayloadAfterSend: boolean;
  render(payload: unknown, to: string): MailMessage;
}

const otpPayloadSchema = z.object({
  code: z.string().regex(/^\d{6}$/),
  locale: z.enum(MAIL_LOCALES),
});

export type OtpPayload = z.infer<typeof otpPayloadSchema>;

const OTP_MAILS: Record<MailLocale, { subject: string; text: string }> = {
  vi: {
    subject: "Mã xác nhận email - ESG Report Online",
    text: `Mã xác nhận của bạn là: {code}\n\nMã có hiệu lực trong ${OTP_TTL_MINUTES} phút. Hãy nhập mã này vào ESG Report Online để lưu và xem lại các báo cáo bạn đã tạo.\n\nNếu bạn không yêu cầu mã này, hãy bỏ qua email này.`,
  },
  en: {
    subject: "Email verification code - ESG Report Online",
    text: `Your verification code is: {code}\n\nThe code is valid for ${OTP_TTL_MINUTES} minutes. Enter it on ESG Report Online to save and revisit the reports you have created.\n\nIf you did not request this code, you can ignore this email.`,
  },
  fr: {
    subject: "Code de vérification e-mail - ESG Report Online",
    text: `Votre code de vérification est : {code}\n\nCe code est valable ${OTP_TTL_MINUTES} minutes. Saisissez-le sur ESG Report Online pour enregistrer et retrouver les rapports que vous avez créés.\n\nSi vous n'avez pas demandé ce code, ignorez simplement cet e-mail.`,
  },
  zh: {
    subject: "邮箱验证码 - ESG Report Online",
    text: `您的验证码是：{code}\n\n验证码在 ${OTP_TTL_MINUTES} 分钟内有效。请在 ESG Report Online 中输入验证码，以保存并重新查看您创建的报告。\n\n如果这不是您本人的操作，请忽略此邮件。`,
  },
};

export const MAIL_TEMPLATES = {
  otp: {
    maxAttempts: 1,
    priority: "high",
    scrubPayloadAfterSend: true,
    render(payload, to) {
      const parsed = otpPayloadSchema.parse(payload);
      const mail = OTP_MAILS[parsed.locale];
      return {
        to,
        subject: mail.subject,
        text: mail.text.replace("{code}", parsed.code),
      };
    },
  },
} as const satisfies Record<string, MailTemplate>;

export type MailTemplateName = keyof typeof MAIL_TEMPLATES;

export function findTemplate(name: string): MailTemplate | undefined {
  return Object.hasOwn(MAIL_TEMPLATES, name)
    ? MAIL_TEMPLATES[name as MailTemplateName]
    : undefined;
}
