import { z } from "zod";

import { pageQuerySchema } from "../common/pagination.js";
import { FEEDBACK_KINDS } from "../database/schema/index.js";

const rating = z.number().int().min(1).max(5);
const comment = z
  .string()
  .trim()
  .max(2000)
  .transform((value) => (value === "" ? undefined : value))
  .optional();

export const directFeedbackSchema = z.object({
  rating,
  comment,
  email: z
    .string()
    .trim()
    .toLowerCase()
    .max(120)
    .pipe(z.email())
    .or(z.literal("").transform(() => undefined))
    .optional(),
});

export const inviteFeedbackSchema = z.object({ rating, comment });

export const feedbackTokenSchema = z.string().min(20).max(100).regex(/^[A-Za-z0-9_-]+$/);

export const listFeedbackQuerySchema = pageQuerySchema.extend({
  kind: z.enum(FEEDBACK_KINDS).optional(),
});

export type DirectFeedbackInput = z.infer<typeof directFeedbackSchema>;
export type InviteFeedbackInput = z.infer<typeof inviteFeedbackSchema>;
export type ListFeedbackQuery = z.infer<typeof listFeedbackQuerySchema>;
