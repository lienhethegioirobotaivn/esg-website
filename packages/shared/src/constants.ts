export const MAX_EVIDENCE_FILES = 10;

export const MAX_EVIDENCE_FILE_SIZE_BYTES = 10 * 1024 * 1024;

export const ACCEPTED_EVIDENCE_MIME_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
] as const;

export const PILLAR_ICONS = ["sprout", "users", "landmark"] as const;

export const PILLAR_CODES = ["E", "S", "G"] as const;

export const INPUT_TYPES = [
  "PRACTICE",
  "INCIDENT",
  "PRESENCE",
  "NUMBER",
  "INTEGER",
  "TEXT",
  "FUEL_TABLE",
  "WORKFORCE_TABLE",
] as const;

export const QUESTION_TIERS = ["basic", "extended"] as const;

export const COMMON_SOURCE = "COMMON";

export const INDUSTRY_SOURCES = {
  manufacturing: "MAN",
  retail: "RET",
  services: "SER",
  it: "ICT",
  construction: "CON",
  agriculture: "AGR",
  education: "EDU",
  other: "OTH",
} as const;

export const QUESTION_SOURCES = [
  COMMON_SOURCE,
  ...Object.values(INDUSTRY_SOURCES),
] as const;

export const HEADCOUNT_TIERS = {
  "lt-10": "basic",
  "10-49": "basic",
  "50-199": "extended",
  "200-499": "extended",
  "gte-500": "extended",
} as const;

export type PillarIcon = (typeof PILLAR_ICONS)[number];
export type PillarCode = (typeof PILLAR_CODES)[number];
export type InputType = (typeof INPUT_TYPES)[number];
export type QuestionTier = (typeof QUESTION_TIERS)[number];
export type QuestionSource = (typeof QUESTION_SOURCES)[number];
export type IndustryValue = keyof typeof INDUSTRY_SOURCES;
export type HeadcountValue = keyof typeof HEADCOUNT_TIERS;
export type EvidenceMimeType = (typeof ACCEPTED_EVIDENCE_MIME_TYPES)[number];

export const LOGO_ACCEPTED_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
] as const;

export const MAX_LOGO_SIZE_BYTES = 2 * 1024 * 1024;

export const ADVISORY_NEEDS = [
  "Chưa có nhu cầu",
  "Đang tìm hiểu",
  "Cần đánh giá khoảng cách trước",
  "Muốn nhận tư vấn & báo giá",
] as const;

export const ASSESSMENT_NEEDS = [
  "Chưa có nhu cầu",
  "Cần trao đổi thêm",
  "Muốn nhận báo giá",
] as const;

export const CONSENT_VALUES = ["", "yes"] as const;

export type LogoMimeType = (typeof LOGO_ACCEPTED_MIME_TYPES)[number];
