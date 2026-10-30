export const MAX_EVIDENCE_FILES = 10;

export const MAX_EVIDENCE_FILE_SIZE_BYTES = 10 * 1024 * 1024;

export const ACCEPTED_EVIDENCE_MIME_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
] as const;

export const ANSWER_VALUES = [
  "implemented",
  "in_progress",
  "not_implemented",
] as const;

export const REQUIREMENT_LEVELS = ["required", "optional"] as const;

export const PILLAR_ICONS = ["sprout", "users", "landmark"] as const;

export const QUESTION_ASPECTS = [
  "system",
  "operation",
  "process",
  "environment",
  "customer",
  "society",
] as const;

export type AnswerValue = (typeof ANSWER_VALUES)[number];
export type RequirementLevel = (typeof REQUIREMENT_LEVELS)[number];
export type PillarIcon = (typeof PILLAR_ICONS)[number];
export type QuestionAspect = (typeof QUESTION_ASPECTS)[number];
export type EvidenceMimeType = (typeof ACCEPTED_EVIDENCE_MIME_TYPES)[number];
