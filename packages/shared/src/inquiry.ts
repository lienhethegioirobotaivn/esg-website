import { z } from "zod";
import { msg } from "./i18n";

export const INQUIRY_KINDS = ["advisory", "assessment"] as const;

export type InquiryKind = (typeof INQUIRY_KINDS)[number];

const emailRule = (value: string) => z.email().safeParse(value).success;

export const inquirySchema = z.object({
  kind: z.enum(INQUIRY_KINDS, { message: msg("Loại yêu cầu không hợp lệ") }),
  name: z
    .string()
    .trim()
    .min(1, msg("Vui lòng nhập tên doanh nghiệp"))
    .max(200, msg("Tên doanh nghiệp tối đa 200 ký tự")),
  description: z.string().trim().max(1000, msg("Tối đa 1000 ký tự")),
  headcount: z.string().min(1, msg("Vui lòng chọn quy mô nhân sự")),
  industry: z.string().min(1, msg("Vui lòng chọn ngành nghề")),
  phone: z
    .string()
    .trim()
    .min(1, msg("Vui lòng nhập số điện thoại"))
    .regex(/^[0-9+()\-.\s]{8,20}$/, msg("Số điện thoại không hợp lệ")),
  email: z
    .string()
    .trim()
    .min(1, msg("Vui lòng nhập email"))
    .max(120, msg("Email tối đa 120 ký tự"))
    .refine(emailRule, msg("Email không hợp lệ")),
});

export type Inquiry = z.infer<typeof inquirySchema>;

export const FEEDBACK_INVITE_DELAY_DAYS = 5;

export const feedbackSchema = z
  .object({
    comment: z.string().trim().max(2000, msg("Ý kiến tối đa 2000 ký tự")),
    email: z
      .string()
      .trim()
      .max(120, msg("Email tối đa 120 ký tự"))
      .refine((value) => value === "" || emailRule(value), msg("Email không hợp lệ")),
  })
  .refine((value) => value.comment !== "" || value.email !== "", {
    message: msg("Vui lòng nhập ý kiến hoặc để lại email"),
    path: ["comment"],
  });

export type Feedback = z.infer<typeof feedbackSchema>;
