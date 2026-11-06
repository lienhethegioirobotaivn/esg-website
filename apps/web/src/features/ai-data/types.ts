import { draftSnapshotSchema } from "@esg/shared";
import { z } from "zod";

export const reviewRowSchema = z.object({
  key: z.string(),
  label: z.string(),
  shown: z.string(),
  quote: z.string(),
  url: z.string(),
  page: z.string(),
  checked: z.enum(["ok", "fail", "none"]),
  flags: z.array(z.string()),
});

export const aiDataResultSchema = z.object({
  content: draftSnapshotSchema.omit({ version: true, savedAt: true }),
  company: z.array(reviewRowSchema),
  answers: z.array(reviewRowSchema),
  defaults: z.array(reviewRowSchema),
  rejected: z.array(z.string()),
  totalQuestions: z.number(),
  verifiedCount: z.number(),
  verifyOn: z.boolean(),
  pageCount: z.number(),
  sourceLabel: z.string(),
});

export const streamEventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("step"), message: z.string() }),
  z.object({ type: z.literal("done"), result: aiDataResultSchema }),
  z.object({ type: z.literal("error"), message: z.string() }),
]);

export type ReviewRow = z.infer<typeof reviewRowSchema>;
export type CheckState = ReviewRow["checked"];
export type AiDataResult = z.infer<typeof aiDataResultSchema>;
export type StreamEvent = z.infer<typeof streamEventSchema>;
