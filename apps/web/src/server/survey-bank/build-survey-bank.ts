import {
  ESG_PILLARS,
  INPUT_TYPES,
  PILLAR_CODES,
  buildSurvey,
  surveySchema,
} from "@esg/shared";
import type {
  InputType,
  PillarCode,
  Question,
  QuestionGroup,
  Survey,
} from "@esg/shared";

import type { SheetTable } from "../google-sheets/parse-csv";
import { APPROVED_STATUS, EXTENDED_LABEL } from "./constants";
import type { QuestionTab } from "./constants";

export interface TabContent {
  readonly tab: QuestionTab;
  readonly table: SheetTable;
}

interface LogicEntry {
  readonly inputType: InputType;
  readonly unit: string;
  readonly required: boolean;
}

interface ParsedRow {
  readonly id: string;
  readonly pillar: PillarCode;
  readonly topic: string;
  readonly text: string;
  readonly tier: Question["tier"];
  readonly guidanceBody: string;
  readonly suggestedEvidence: string;
  readonly improvementHint: string;
}

const SECTOR_GROUP_ORDER_BASE = 100;

function isInputType(value: string): value is InputType {
  return INPUT_TYPES.some((type) => type === value);
}

function isPillarCode(value: string): value is PillarCode {
  return PILLAR_CODES.some((code) => code === value);
}

function readLogic(table: SheetTable): ReadonlyMap<string, LogicEntry> {
  const entries = new Map<string, LogicEntry>();
  for (const row of table.rows) {
    const id = row["question_id"] ?? "";
    if (id === "") {
      continue;
    }
    const rawType = row["input_type"] ?? "";
    entries.set(id, {
      inputType: isInputType(rawType) ? rawType : "TEXT",
      unit: row["unit"] ?? "",
      required: (row["Bắt buộc trả lời"] ?? "Có") !== "Không",
    });
  }
  return entries;
}

function parseTopic(rawTopic: string): { pillar: PillarCode; topic: string } {
  const separator = rawTopic.indexOf("·");
  if (separator < 0) {
    return { pillar: "G", topic: rawTopic.trim() };
  }
  const prefix = rawTopic.slice(0, separator).trim().toUpperCase();
  const topic = rawTopic.slice(separator + 1).trim();
  return isPillarCode(prefix)
    ? { pillar: prefix, topic }
    : { pillar: "G", topic: rawTopic.replace("·", "-").trim() };
}

function readRows(table: SheetTable, seen: Set<string>): ParsedRow[] {
  const rows: ParsedRow[] = [];
  for (const row of table.rows) {
    const id = row["Mã câu"] ?? "";
    const text = row["Câu hỏi hiển thị"] ?? "";
    if (
      id === "" ||
      text === "" ||
      seen.has(id) ||
      row["Duyệt nội dung"] !== APPROVED_STATUS
    ) {
      continue;
    }
    seen.add(id);
    const { pillar, topic } = parseTopic(row["Chủ đề"] ?? "");
    rows.push({
      id,
      pillar,
      topic,
      text,
      tier: row["Mức khai báo"] === EXTENDED_LABEL ? "extended" : "basic",
      guidanceBody: row["Hướng dẫn điền"] ?? "",
      suggestedEvidence: row["Bằng chứng gợi ý"] ?? "",
      improvementHint: row["Gợi ý cải thiện ban đầu"] ?? "",
    });
  }
  return rows;
}

function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

interface Section {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly order: number;
  readonly rows: ParsedRow[];
}

function groupByTopic(
  rows: readonly ParsedRow[],
  source: string,
  pillarId: string,
  description: string,
  orderBase: number,
  label: string,
): Section[] {
  const sections = new Map<string, Section>();
  for (const row of rows) {
    const key = row.topic;
    const existing = sections.get(key);
    if (existing) {
      existing.rows.push(row);
    } else {
      sections.set(key, {
        id: `${source}-${pillarId}-${slugify(key) || "khac"}`,
        title:
          (key === "" ? "Khác" : key) + (label === "" ? "" : ` (${label})`),
        description,
        order: orderBase + sections.size + 1,
        rows: [row],
      });
    }
  }
  return [...sections.values()];
}

export function buildSurveyBank(
  contents: readonly TabContent[],
  logicTable: SheetTable,
): Survey {
  const logic = readLogic(logicTable);
  const seen = new Set<string>();
  const groups: QuestionGroup[] = [];
  const questions: Question[] = [];

  contents.forEach(({ tab, table }, tabIndex) => {
    const rows = readRows(table, seen);
    for (const pillar of ESG_PILLARS) {
      const pillarRows = rows.filter((row) => row.pillar === pillar.id);
      if (pillarRows.length === 0) {
        continue;
      }
      const sections = groupByTopic(
        pillarRows,
        tab.source,
        pillar.id,
        tab.groupTitle ?? "",
        tab.groupTitle === null ? 0 : SECTOR_GROUP_ORDER_BASE + tabIndex * 100,
        tab.label,
      );

      for (const section of sections) {
        groups.push({
          id: section.id,
          pillarId: pillar.id,
          order: section.order,
          title: section.title,
          description: section.description,
        });
        section.rows.forEach((row, index) => {
          const entry = logic.get(row.id);
          questions.push({
            id: row.id,
            groupId: section.id,
            order: index + 1,
            text: row.text,
            topic: row.topic,
            source: tab.source,
            tier: row.tier,
            inputType: entry?.inputType ?? "PRACTICE",
            unit: entry?.unit ?? "",
            required: entry?.required ?? true,
            improvementHint: row.improvementHint,
            guidance: {
              title: row.topic,
              body: row.guidanceBody,
              suggestedEvidence: row.suggestedEvidence,
              tip: "",
            },
          });
        });
      }
    }
  });

  return surveySchema.parse(
    buildSurvey({
      pillars: ESG_PILLARS.map((pillar) => ({ ...pillar })),
      groups,
      questions,
    }),
  );
}
