import type { PillarIcon, SurveyGroup } from "@esg/shared";

import type { EvidenceItem } from "@/features/evidence";

export interface AnswerDraft {
  readonly value: string | null;
  readonly number: string;
  readonly description: string;
  readonly evidence: readonly EvidenceItem[];
}

export type AnswerMap = Readonly<Record<string, AnswerDraft>>;

export interface GroupEntry {
  readonly pillarId: string;
  readonly pillarName: string;
  readonly pillarIcon: PillarIcon;
  readonly group: SurveyGroup;
}
