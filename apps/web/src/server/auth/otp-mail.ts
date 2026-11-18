import "server-only";

import { EMAIL_OTP_RULES } from "@esg/shared";
import type { ReportArchiveLocale } from "@esg/shared";

const MINUTES = Math.round(EMAIL_OTP_RULES.ttlSeconds / 60);

interface OtpMail {
  readonly subject: string;
  readonly text: string;
}

const MAILS: Record<ReportArchiveLocale, OtpMail> = {
  vi: {
    subject: "Mã xác nhận email - ESG Report Online",
    text: `Mã xác nhận của bạn là: {code}\n\nMã có hiệu lực trong ${MINUTES} phút. Hãy nhập mã này vào ESG Report Online để lưu và xem lại các báo cáo bạn đã tạo.\n\nNếu bạn không yêu cầu mã này, hãy bỏ qua email này.`,
  },
  en: {
    subject: "Email verification code - ESG Report Online",
    text: `Your verification code is: {code}\n\nThe code is valid for ${MINUTES} minutes. Enter it on ESG Report Online to save and revisit the reports you have created.\n\nIf you did not request this code, you can ignore this email.`,
  },
  fr: {
    subject: "Code de vérification e-mail - ESG Report Online",
    text: `Votre code de vérification est : {code}\n\nCe code est valable ${MINUTES} minutes. Saisissez-le sur ESG Report Online pour enregistrer et retrouver les rapports que vous avez créés.\n\nSi vous n'avez pas demandé ce code, ignorez simplement cet e-mail.`,
  },
  zh: {
    subject: "邮箱验证码 - ESG Report Online",
    text: `您的验证码是：{code}\n\n验证码在 ${MINUTES} 分钟内有效。请在 ESG Report Online 中输入验证码，以保存并重新查看您创建的报告。\n\n如果这不是您本人的操作，请忽略此邮件。`,
  },
};

export function buildOtpMail(locale: ReportArchiveLocale): OtpMail {
  return MAILS[locale];
}
