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

const inquiryNoticePayloadSchema = z.object({
  code: z.string().min(1).max(40),
  kind: z.enum(["consulting", "verification"]),
  companyName: z.string().min(1).max(200),
  url: z.string().min(1).max(500),
});

const feedbackInvitePayloadSchema = z.object({
  url: z.string().min(1).max(600),
  reportCode: z.string().min(1).max(40),
  locale: z.enum(MAIL_LOCALES),
});

const INVITE_MAILS: Record<MailLocale, { subject: string; text: string }> = {
  vi: {
    subject: "Báo cáo ESG của bạn thế nào? - ESG Report Online",
    text: "Cảm ơn bạn đã tạo báo cáo {reportCode} trên ESG Report Online.\n\nChúng tôi rất muốn biết trải nghiệm của bạn. Chỉ mất chưa đến một phút:\n{url}\n\nLiên kết chỉ dùng được một lần. Nếu không muốn trả lời, bạn có thể bỏ qua email này.",
  },
  en: {
    subject: "How was your ESG report? - ESG Report Online",
    text: "Thank you for creating report {reportCode} on ESG Report Online.\n\nWe would love to hear how it went. It takes under a minute:\n{url}\n\nThis link works only once. If you prefer not to reply, you can ignore this email.",
  },
  fr: {
    subject: "Que pensez-vous de votre rapport ESG ? - ESG Report Online",
    text: "Merci d'avoir créé le rapport {reportCode} sur ESG Report Online.\n\nNous aimerions connaître votre avis, cela prend moins d'une minute :\n{url}\n\nCe lien ne fonctionne qu'une seule fois. Vous pouvez ignorer cet e-mail si vous ne souhaitez pas répondre.",
  },
  zh: {
    subject: "您觉得 ESG 报告怎么样？- ESG Report Online",
    text: "感谢您在 ESG Report Online 创建报告 {reportCode}。\n\n我们很想了解您的体验，只需不到一分钟：\n{url}\n\n此链接仅可使用一次。如不想回复，请忽略此邮件。",
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
  inquiry_notice: {
    maxAttempts: 5,
    priority: "normal",
    scrubPayloadAfterSend: false,
    render(payload, to) {
      const parsed = inquiryNoticePayloadSchema.parse(payload);
      const kind = parsed.kind === "consulting" ? "tư vấn" : "thẩm định";
      return {
        to,
        subject: `Yêu cầu ${kind} mới: ${parsed.companyName} (${parsed.code})`,
        text: `Có yêu cầu ${kind} mới từ ${parsed.companyName}.\nMã yêu cầu: ${parsed.code}\nXem chi tiết: ${parsed.url}`,
      };
    },
  },
  feedback_invite: {
    maxAttempts: 3,
    priority: "normal",
    scrubPayloadAfterSend: true,
    render(payload, to) {
      const parsed = feedbackInvitePayloadSchema.parse(payload);
      const mail = INVITE_MAILS[parsed.locale];
      return {
        to,
        subject: mail.subject,
        text: mail.text.replace("{reportCode}", parsed.reportCode).replace("{url}", parsed.url),
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
