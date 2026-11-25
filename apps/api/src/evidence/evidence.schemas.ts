import { REPORT_CODE_PATTERN } from "@esg/shared/node";
import { z } from "zod";

import { QUESTION_CODE_PATTERN } from "../question-bank/question-bank.constants.js";

export const uploadEvidenceFieldsSchema = z.object({
  reportCode: z.string().regex(REPORT_CODE_PATTERN),
  questionCode: z.string().regex(QUESTION_CODE_PATTERN),
});

export const listEvidenceQuerySchema = z.object({
  reportCode: z.string().regex(REPORT_CODE_PATTERN),
});

export const evidenceIdSchema = z.uuid();
