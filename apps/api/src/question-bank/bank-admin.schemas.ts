import {
  BANK_AI_CASE_FIELDS,
  BANK_EVIDENCE_CODES,
  BANK_EVIDENCE_FIELDS,
  BANK_PROFILE_INPUT_TYPES,
  INPUT_TYPES,
} from "@esg/shared/node";
import { z } from "zod";

import {
  QUESTION_PILLARS,
  QUESTION_REVIEW_STATUSES,
  QUESTION_ROLLOUT_STATUSES,
  QUESTION_SOURCES,
  QUESTION_TIERS,
} from "../database/schema/index.js";

const BULK_LIMIT = 500;

export const bankVersionSchema = z
  .string()
  .trim()
  .regex(/^[0-9A-Za-z][0-9A-Za-z._-]{0,29}$/);

const note = z.string().trim().max(500);
const shortText = (max: number) => z.string().trim().max(max);
const longText = shortText(4000);

const stringRecord = <K extends string>(keys: readonly K[]) =>
  Object.fromEntries(keys.map((key) => [key, longText.optional()])) as Record<
    K,
    z.ZodOptional<typeof longText>
  >;

const aiCaseSchema = z.object(stringRecord(BANK_AI_CASE_FIELDS.map(([key]) => key))).strict();

const evidenceRuleSchema = z
  .object({
    ...stringRecord(BANK_EVIDENCE_FIELDS.map(([key]) => key)),
    code: z.enum(BANK_EVIDENCE_CODES),
    testCases: z.array(aiCaseSchema).max(30).optional(),
  })
  .strict();

const questionFields = {
  pillar: z.enum(QUESTION_PILLARS).nullable(),
  topic: shortText(200),
  text: z.string().trim().min(1).max(2000),
  guidance: longText,
  evidenceHint: longText,
  improvementHint: longText,
  inputType: z.enum([...INPUT_TYPES, ...BANK_PROFILE_INPUT_TYPES]),
  unit: shortText(50),
  required: z.boolean(),
  declarationLevel: z.enum(QUESTION_TIERS),
  capabilities: z.array(z.string().regex(/^[a-z][a-z0-9_]{0,39}$/)).max(20),
  reportSection: shortText(40),
  sourceRef: shortText(100),
  reviewStatus: z.enum(QUESTION_REVIEW_STATUSES),
  reviewNote: longText,
  reviewedBy: shortText(100),
  reviewedOn: z.union([z.iso.date(), z.literal("")]),
  rolloutStatus: z.enum(QUESTION_ROLLOUT_STATUSES),
  evidenceRule: evidenceRuleSchema,
};

const code = z.string().trim().toUpperCase().max(10);

export const createQuestionSchema = z
  .object(questionFields)
  .partial()
  .extend({
    source: z.enum(QUESTION_SOURCES),
    text: questionFields.text,
    code: code.optional(),
    afterId: z.uuid().nullable().optional(),
  })
  .strict();

export const updateQuestionSchema = z
  .object(questionFields)
  .partial()
  .extend({ code: code.optional() })
  .strict()
  .refine((value) => Object.keys(value).length > 0);

const ids = z.array(z.uuid()).min(1).max(BULK_LIMIT);

export const bulkQuestionSchema = z
  .object({
    ids,
    patch: z
      .object({
        reviewStatus: questionFields.reviewStatus,
        declarationLevel: questionFields.declarationLevel,
        required: questionFields.required,
        rolloutStatus: questionFields.rolloutStatus,
      })
      .partial()
      .strict()
      .refine((value) => Object.keys(value).length > 0),
  })
  .strict();

export const deleteQuestionsSchema = z.object({ ids }).strict();

export const reorderSchema = z.object({ source: z.enum(QUESTION_SOURCES), ids }).strict();

export const createBankSchema = z
  .object({ fromId: z.uuid(), version: bankVersionSchema, note })
  .partial()
  .strict();

export const updateBankSchema = z
  .object({ version: bankVersionSchema, note })
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0);

export const importBankSchema = z.object({
  version: z
    .union([bankVersionSchema, z.literal("")])
    .optional()
    .transform((value) => (value === "" ? undefined : value)),
  note: note.optional(),
  dryRun: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
});

export type CreateQuestionInput = z.infer<typeof createQuestionSchema>;
export type UpdateQuestionInput = z.infer<typeof updateQuestionSchema>;
export type BulkQuestionInput = z.infer<typeof bulkQuestionSchema>;
export type ReorderInput = z.infer<typeof reorderSchema>;
export type CreateBankInput = z.infer<typeof createBankSchema>;
export type UpdateBankInput = z.infer<typeof updateBankSchema>;
export type ImportBankInput = z.infer<typeof importBankSchema>;
