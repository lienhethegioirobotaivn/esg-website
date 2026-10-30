import { z } from "zod";

import { ANSWER_VALUES } from "./constants";

export const DRAFT_VERSION = 1;

export const draftAnswerSchema = z.object({
  value: z.enum(ANSWER_VALUES),
  description: z.string(),
});

export const draftSnapshotSchema = z.object({
  version: z.literal(DRAFT_VERSION),
  savedAt: z.string(),
  company: z.record(z.string(), z.string()),
  answers: z.record(z.string().uuid(), draftAnswerSchema),
  activeGroupId: z.string().uuid().nullable(),
});

export type DraftAnswer = z.infer<typeof draftAnswerSchema>;
export type DraftSnapshot = z.infer<typeof draftSnapshotSchema>;
export type DraftContent = Omit<DraftSnapshot, "version" | "savedAt">;
