import {
  ESG_PILLARS,
  INPUT_TYPES,
  buildSurvey,
  surveySchema,
  type InputType,
  type Question,
  type QuestionGroup,
  type QuestionSource,
  type QuestionTier,
  type Survey,
} from "@esg/shared/node";
import { z } from "zod";

import type { QuestionPillar, QuestionTrack } from "../database/schema/index.js";
import { PROFILE_EXTRA_INPUT_TYPES, SURVEY_TABS } from "./question-bank.constants.js";

export interface BankQuestionRecord {
  readonly code: string;
  readonly source: string;
  readonly track: QuestionTrack;
  readonly groupCode: string;
  readonly pillar: QuestionPillar | null;
  readonly topic: string | null;
  readonly inputType: string;
  readonly unit: string | null;
  readonly required: boolean;
  readonly text: string;
  readonly guidance: string | null;
  readonly evidenceHint: string | null;
  readonly improvementHint: string | null;
  readonly declarationLevel: QuestionTier;
  readonly position: number;
}

export const profileQuestionSchema = z.object({
  id: z.string().min(1),
  groupId: z.string().min(1),
  order: z.number().int().nonnegative(),
  text: z.string().min(1),
  topic: z.string(),
  tier: z.enum(["basic", "extended"]),
  inputType: z.enum([...INPUT_TYPES, ...PROFILE_EXTRA_INPUT_TYPES]),
  unit: z.string(),
  required: z.boolean(),
  guidance: z.object({
    title: z.string(),
    body: z.string(),
    suggestedEvidence: z.string(),
    tip: z.string(),
  }),
});

export type ProfileQuestion = z.infer<typeof profileQuestionSchema>;

export interface SurveyBankContent {
  readonly survey: Survey;
  readonly profile: ProfileQuestion[];
}

const SECTOR_GROUP_ORDER_BASE = 100;

function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function toInputType(value: string, code: string): InputType {
  const found = INPUT_TYPES.find((type) => type === value);
  if (found === undefined) {
    throw new Error(`Câu ${code} có kiểu nhập ${value} không dùng được trong khảo sát.`);
  }
  return found;
}

function bySortKey(a: BankQuestionRecord, b: BankQuestionRecord): number {
  return a.position - b.position;
}

interface Section {
  readonly id: string;
  readonly title: string;
  readonly order: number;
  readonly rows: BankQuestionRecord[];
}

export function buildSurveyContent(records: readonly BankQuestionRecord[]): SurveyBankContent {
  const groups: QuestionGroup[] = [];
  const questions: Question[] = [];

  SURVEY_TABS.forEach((tab, tabIndex) => {
    const tabRows = records.filter((record) => record.source === tab.source).sort(bySortKey);
    for (const pillar of ESG_PILLARS) {
      const pillarRows = tabRows.filter((record) => record.pillar === pillar.id);
      if (pillarRows.length === 0) {
        continue;
      }
      const orderBase = tab.groupTitle === null ? 0 : SECTOR_GROUP_ORDER_BASE + tabIndex * 100;
      const sections = new Map<string, Section>();
      for (const row of pillarRows) {
        const key = row.topic ?? "";
        const existing = sections.get(key);
        if (existing === undefined) {
          sections.set(key, {
            id: `${tab.source}-${pillar.id}-${slugify(key) || "khac"}`,
            title: (key === "" ? "Khác" : key) + (tab.label === "" ? "" : ` (${tab.label})`),
            order: orderBase + sections.size + 1,
            rows: [row],
          });
        } else {
          existing.rows.push(row);
        }
      }

      for (const section of sections.values()) {
        groups.push({
          id: section.id,
          pillarId: pillar.id,
          order: section.order,
          title: section.title,
          description: tab.groupTitle ?? "",
        });
        section.rows.forEach((row, index) => {
          questions.push({
            id: row.code,
            groupId: section.id,
            order: index + 1,
            text: row.text,
            topic: row.topic ?? "",
            source: row.source as QuestionSource,
            tier: row.declarationLevel,
            inputType: toInputType(row.inputType, row.code),
            unit: row.unit ?? "",
            required: row.required,
            improvementHint: row.improvementHint ?? "",
            guidance: {
              title: row.topic ?? "",
              body: row.guidance ?? "",
              suggestedEvidence: row.evidenceHint ?? "",
              tip: "",
            },
          });
        });
      }
    }
  });

  const survey = surveySchema.parse(
    buildSurvey({
      pillars: ESG_PILLARS.map((pillar) => ({ ...pillar })),
      groups,
      questions,
    }),
  );

  const profile = records
    .filter((record) => record.track === "profile")
    .sort(bySortKey)
    .map((record) =>
      profileQuestionSchema.parse({
        id: record.code,
        groupId: record.groupCode,
        order: record.position,
        text: record.text,
        topic: record.topic ?? "",
        tier: record.declarationLevel,
        inputType: record.inputType,
        unit: record.unit ?? "",
        required: record.required,
        guidance: {
          title: record.topic ?? "",
          body: record.guidance ?? "",
          suggestedEvidence: record.evidenceHint ?? "",
          tip: "",
        },
      }),
    );

  return { survey, profile };
}
