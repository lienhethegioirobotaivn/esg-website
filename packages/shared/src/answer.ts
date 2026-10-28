import { z } from "zod";

import {
  ACCEPTED_EVIDENCE_MIME_TYPES,
  MAX_EVIDENCE_FILES,
  MAX_EVIDENCE_FILE_SIZE_BYTES,
} from "./constants";

export const evidenceFileSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  size: z.number().int().positive().max(MAX_EVIDENCE_FILE_SIZE_BYTES),
  mimeType: z.enum(ACCEPTED_EVIDENCE_MIME_TYPES),
});

const answerBaseSchema = z.object({
  questionId: z.string().min(1),
});

export const answerSchema = z.discriminatedUnion("value", [
  answerBaseSchema.extend({
    value: z.literal("yes"),
    description: z.string(),
    evidence: z.array(evidenceFileSchema).max(MAX_EVIDENCE_FILES),
  }),
  answerBaseSchema.extend({
    value: z.literal("no"),
  }),
  answerBaseSchema.extend({
    value: z.literal("not_applicable"),
  }),
]);

export type EvidenceFile = z.infer<typeof evidenceFileSchema>;
export type Answer = z.infer<typeof answerSchema>;
