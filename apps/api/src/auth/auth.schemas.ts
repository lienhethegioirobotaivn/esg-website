import { z } from "zod";

import { MAIL_LOCALES } from "../mail/mail-templates.js";
import { OTP_RULES } from "./auth.constants.js";

const emailAddressSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email().max(OTP_RULES.maxEmailLength));

export const emailOtpRequestSchema = z.object({
  email: emailAddressSchema,
  locale: z.enum(MAIL_LOCALES),
});

export const emailOtpVerifySchema = z.object({
  email: emailAddressSchema,
  code: z.string().regex(new RegExp(`^\\d{${OTP_RULES.codeLength}}$`)),
});
