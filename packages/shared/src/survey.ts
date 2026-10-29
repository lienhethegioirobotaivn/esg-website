import { z } from "zod";

import { PILLAR_ICONS, REQUIREMENT_LEVELS } from "./constants";

const idSchema = z.uuid();

export const guidanceSchema = z.object({
  title: z.string().min(1, "Vui lòng nhập tiêu đề hướng dẫn"),
  body: z.string().min(1, "Vui lòng nhập nội dung hướng dẫn"),
  suggestedEvidence: z.string(),
  tip: z.string(),
});

export const pillarSchema = z.object({
  id: idSchema,
  name: z.string().min(1, "Vui lòng nhập tên trụ cột"),
  icon: z.enum(PILLAR_ICONS),
  order: z.number().int().nonnegative(),
});

export const questionGroupSchema = z.object({
  id: idSchema,
  pillarId: idSchema,
  order: z.number().int().nonnegative(),
  title: z.string().min(1, "Vui lòng nhập tên nhóm"),
  description: z.string(),
});

export const questionSchema = z.object({
  id: idSchema,
  groupId: idSchema,
  order: z.number().int().nonnegative(),
  text: z.string().min(1, "Vui lòng nhập nội dung câu hỏi"),
  descriptionRequirement: z.enum(REQUIREMENT_LEVELS),
  evidenceRequirement: z.enum(REQUIREMENT_LEVELS),
  guidance: guidanceSchema,
});

export const pillarInputSchema = pillarSchema.omit({ id: true, order: true });

export const questionGroupInputSchema = questionGroupSchema
  .omit({ id: true, order: true })
  .extend({ pillarId: idSchema });

export const questionInputSchema = questionSchema.omit({
  id: true,
  order: true,
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
export type PillarInput = z.infer<typeof pillarInputSchema>;
export type QuestionGroupInput = z.infer<typeof questionGroupInputSchema>;
export type QuestionInput = z.infer<typeof questionInputSchema>;
export type SurveyGroup = z.infer<typeof surveyGroupSchema>;
export type SurveyPillar = z.infer<typeof surveyPillarSchema>;
export type Survey = z.infer<typeof surveySchema>;
