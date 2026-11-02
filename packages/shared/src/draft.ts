import { z } from "zod";

export const DRAFT_VERSION = 2;

export const draftAnswerSchema = z.object({
  value: z.string().min(1),
  number: z.string(),
  description: z.string(),
});

export const draftSnapshotSchema = z.object({
  version: z.literal(DRAFT_VERSION),
  savedAt: z.string(),
  company: z.record(z.string(), z.string()),
  answers: z.record(z.string().min(1), draftAnswerSchema),
  activeGroupId: z.string().min(1).nullable(),
});

export type DraftAnswer = z.infer<typeof draftAnswerSchema>;
export type DraftSnapshot = z.infer<typeof draftSnapshotSchema>;
export type DraftContent = Omit<DraftSnapshot, "version" | "savedAt">;
