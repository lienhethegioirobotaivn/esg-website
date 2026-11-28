import {
  BANK_SOURCES,
  BANK_SOURCE_LABELS,
  type BankQuestionView,
  type BankReviewStatus,
  type BankSource,
  type BankStatus,
} from "@esg/shared";

import type { Tone } from "@/features/backoffice/lib/labels";

export const REVIEW_TONES: Readonly<Record<BankReviewStatus, Tone>> = {
  pending: "amber",
  changes: "red",
  approved: "green",
  rejected: "gray",
};

export const BANK_STATUS_TONES: Readonly<Record<BankStatus, Tone>> = {
  draft: "amber",
  published: "green",
  archived: "gray",
};

export const TIER_LABELS = { basic: "Cơ bản", extended: "Mở rộng" } as const;

export const PILLAR_LABELS = {
  E: "E · Môi trường",
  S: "S · Xã hội",
  G: "G · Quản trị",
} as const;

export const SECTOR_FREE_SOURCES: readonly BankSource[] = [
  "PROFILE",
  "COMMON",
];

export function isBankSource(value: string): value is BankSource {
  return (BANK_SOURCES as readonly string[]).includes(value);
}

export function sourceOptions(questions: readonly BankQuestionView[]) {
  return BANK_SOURCES.map((source) => ({
    value: source,
    label: `${BANK_SOURCE_LABELS[source]} (${questions.filter((question) => question.source === source).length})`,
  }));
}

export interface QuestionFilters {
  search: string;
  review: string;
  rollout: string;
  tier: string;
}

export const NO_FILTERS: QuestionFilters = {
  search: "",
  review: "",
  rollout: "",
  tier: "",
};

export function isFiltering(filters: QuestionFilters): boolean {
  return Object.values(filters).some((value) => value.trim() !== "");
}

function fold(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();
}

export function visibleQuestions(
  questions: readonly BankQuestionView[],
  source: BankSource,
  filters: QuestionFilters,
): BankQuestionView[] {
  const search = fold(filters.search.trim());
  const everywhere = isFiltering(filters);
  return questions
    .filter(
      (question) =>
        (everywhere || question.source === source) &&
        (search === "" ||
          fold(
            `${question.code} ${question.text} ${question.topic} ${question.guidance}`,
          ).includes(search)) &&
        (filters.review === "" || question.reviewStatus === filters.review) &&
        (filters.rollout === "" ||
          question.rolloutStatus === filters.rollout) &&
        (filters.tier === "" || question.declarationLevel === filters.tier),
    )
    .sort(
      (a, b) =>
        BANK_SOURCES.indexOf(a.source) - BANK_SOURCES.indexOf(b.source) ||
        a.position - b.position,
    );
}

export function ofSource(
  questions: readonly BankQuestionView[],
  source: BankSource,
): BankQuestionView[] {
  return questions
    .filter((question) => question.source === source)
    .sort((a, b) => a.position - b.position);
}

export function movedIds(
  ids: readonly string[],
  id: string,
  targetIndex: number,
): string[] {
  const rest = ids.filter((candidate) => candidate !== id);
  rest.splice(Math.max(0, Math.min(targetIndex, rest.length)), 0, id);
  return rest;
}

export function shorten(text: string, length = 70): string {
  return text.length > length ? `${text.slice(0, length)}…` : text;
}
