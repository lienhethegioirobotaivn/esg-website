import type {
  QuestionPillar,
  QuestionReviewStatus,
  QuestionRolloutStatus,
  QuestionSource,
  QuestionTier,
  QuestionTrack,
} from "../database/schema/index.js";

export type IssueSeverity = "error" | "warning";

export interface ImportIssue {
  readonly severity: IssueSeverity;
  readonly tab: string;
  readonly row: number | null;
  readonly code: string | null;
  readonly message: string;
}

export interface ParsedQuestion {
  readonly code: string;
  readonly tabName: string;
  readonly sourceRow: number;
  readonly source: QuestionSource;
  readonly track: QuestionTrack;
  readonly saveGroup: string;
  readonly position: number;
  readonly pillar: QuestionPillar | null;
  readonly topic: string;
  readonly text: string;
  readonly inputType: string;
  readonly unit: string | null;
  readonly required: boolean;
  readonly guidance: string | null;
  readonly evidenceHint: string | null;
  readonly improvementHint: string | null;
  readonly declarationLevel: QuestionTier;
  readonly route: Record<string, unknown>;
  readonly evidenceRule: Record<string, unknown> | null;
  readonly reviewStatus: QuestionReviewStatus;
  readonly reviewNote: string | null;
  readonly reviewedBy: string | null;
  readonly reviewedOn: string | null;
  readonly rolloutStatus: QuestionRolloutStatus;
  readonly reportSection: string | null;
  readonly sourceRef: string | null;
}

export interface ParsedGroup {
  readonly code: string;
  readonly tabName: string;
  readonly track: QuestionTrack;
  readonly position: number;
  readonly title: string;
}

export interface ParsedBank {
  readonly version: string | null;
  readonly groups: readonly ParsedGroup[];
  readonly questions: readonly ParsedQuestion[];
  readonly issues: readonly ImportIssue[];
}

export interface ImportSummary {
  readonly bankId: string;
  readonly version: string;
  readonly status: "draft" | "published";
  readonly groups: number;
  readonly questions: number;
  readonly approved: number;
  readonly pending: number;
  readonly replacedDraft: boolean;
  readonly archivedVersion: string | null;
}
