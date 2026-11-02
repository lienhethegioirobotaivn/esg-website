import { z } from "zod";

import {
  INPUT_TYPES,
  PILLAR_ICONS,
  QUESTION_SOURCES,
  QUESTION_TIERS,
} from "./constants";

const idSchema = z.string().min(1);

export const guidanceSchema = z.object({
  title: z.string(),
  body: z.string(),
  suggestedEvidence: z.string(),
  tip: z.string(),
});

export const pillarSchema = z.object({
  id: idSchema,
  name: z.string().min(1),
  icon: z.enum(PILLAR_ICONS),
  order: z.number().int().nonnegative(),
});

export const questionGroupSchema = z.object({
  id: idSchema,
  pillarId: idSchema,
  order: z.number().int().nonnegative(),
  title: z.string().min(1),
  description: z.string(),
});

export const questionSchema = z.object({
  id: idSchema,
  groupId: idSchema,
  order: z.number().int().nonnegative(),
  text: z.string().min(1),
  topic: z.string(),
  source: z.enum(QUESTION_SOURCES),
  tier: z.enum(QUESTION_TIERS),
  inputType: z.enum(INPUT_TYPES),
  unit: z.string(),
  required: z.boolean(),
  improvementHint: z.string(),
  guidance: guidanceSchema,
});

export const surveyGroupSchema = questionGroupSchema.extend({
  questions: z.array(questionSchema),
});

export const surveyPillarSchema = pillarSchema.extend({
  groups: z.array(surveyGroupSchema),
});

export const surveySchema = z.array(surveyPillarSchema);

export type Guidance = z.infer<typeof guidanceSchema>;
export type Pillar = z.infer<typeof pillarSchema>;
export type QuestionGroup = z.infer<typeof questionGroupSchema>;
export type Question = z.infer<typeof questionSchema>;
export type SurveyGroup = z.infer<typeof surveyGroupSchema>;
export type SurveyPillar = z.infer<typeof surveyPillarSchema>;
export type Survey = z.infer<typeof surveySchema>;
