import { DRAFT_VERSION, REPORT_CODE_PATTERN } from "@esg/shared/node";
import { z } from "zod";

export const draftQuerySchema = z.object({
  reportCode: z.string().regex(REPORT_CODE_PATTERN).optional(),
});

export const putDraftSchema = z.object({
  reportCode: z.string().regex(REPORT_CODE_PATTERN).nullable(),
  schemaVersion: z.literal(DRAFT_VERSION),
  data: z.record(z.string(), z.unknown()),
  baseUpdatedAt: z.string().max(40).optional(),
  overwrite: z.boolean().optional(),
});

export type PutDraftInput = z.infer<typeof putDraftSchema>;
