import { asc, eq } from "drizzle-orm";

import type { Database } from "../database/client.js";
import { questionGroups, questions } from "../database/schema/index.js";
import { BANK_TABS } from "./question-bank.constants.js";
import type { ParsedBank } from "./question-bank.types.js";

export type BankReader = Pick<Database, "select">;

export type StoredQuestion = typeof questions.$inferSelect;
export type StoredGroup = typeof questionGroups.$inferSelect;

export interface StoredBank {
  readonly groups: StoredGroup[];
  readonly questions: StoredQuestion[];
}

function tabIndex(source: string): number {
  return BANK_TABS.findIndex((tab) => tab.source === source);
}

export async function loadStoredBank(db: BankReader, bankId: string): Promise<StoredBank> {
  const groups = await db
    .select()
    .from(questionGroups)
    .where(eq(questionGroups.bankId, bankId))
    .orderBy(asc(questionGroups.position));
  const rows = await db.select().from(questions).where(eq(questions.bankId, bankId));
  rows.sort(
    (a, b) =>
      tabIndex(a.source) - tabIndex(b.source) ||
      a.position - b.position ||
      a.code.localeCompare(b.code),
  );
  return { groups, questions: rows };
}

export function toParsedBank(version: string, stored: StoredBank): ParsedBank {
  const groupCodes = new Map(stored.groups.map((group) => [group.id, group.code]));
  return {
    version,
    issues: [],
    groups: stored.groups.map((group) => ({
      code: group.code,
      tabName: "",
      track: group.track,
      position: group.position,
      title: group.title,
    })),
    questions: stored.questions.map((question) => {
      const tab = BANK_TABS[tabIndex(question.source)];
      return {
        code: question.code,
        tabName: tab?.tabName ?? "",
        sourceRow: 0,
        source: question.source,
        track: tab?.track ?? "core",
        saveGroup: groupCodes.get(question.groupId) ?? "",
        position: question.position,
        pillar: question.pillar,
        topic: question.topic ?? "",
        text: question.text,
        inputType: question.inputType,
        unit: question.unit,
        required: question.required,
        guidance: question.guidance,
        evidenceHint: question.evidenceHint,
        improvementHint: question.improvementHint,
        declarationLevel: question.declarationLevel,
        route: question.route,
        evidenceRule: question.evidenceRule,
        reviewStatus: question.reviewStatus,
        reviewNote: question.reviewNote,
        reviewedBy: question.reviewedBy,
        reviewedOn: question.reviewedOn,
        rolloutStatus: question.rolloutStatus,
        reportSection: question.reportSection,
        sourceRef: question.sourceRef,
      };
    }),
  };
}
