import {
  PROFILE_FIELDS,
  REPORT_PERIODS,
  getAnswerChoices,
  getAnswerIssues,
  isValidNumber,
  profileSchema,
} from "@esg/shared";
import type { DraftAnswer, DraftContent, Question, Survey } from "@esg/shared";
import { z } from "zod";

import {
  COMPANY_FIELD_LABELS,
  COMPANY_INITIAL_VALUES,
} from "@/features/company/constants";
import type { CompanyField } from "@/features/company/constants";
import type { CheckState, ReviewRow } from "@/features/ai-data/types";

import { locateQuote, quoteContainsNumber } from "./verify";
import type { SourcePage } from "./verify";

const QUOTE_REQUIRED = new Set(["yes", "partial", "known", "provided"]);

const DEFAULT_NOTE = "Báo cáo không nêu thông tin này";

function negativeDefault(question: Question): DraftAnswer {
  switch (question.inputType) {
    case "PRACTICE":
    case "INCIDENT":
    case "PRESENCE":
      return { value: "no", number: "", description: "" };
    case "TEXT":
      return { value: "unknown", number: "", description: DEFAULT_NOTE };
    case "NUMBER":
    case "INTEGER":
    case "FUEL_TABLE":
    case "WORKFORCE_TABLE":
      return { value: "unknown", number: "", description: "" };
  }
}

const ISSUE_LABELS = {
  unanswered: "chưa trả lời",
  "missing-detail": "thiếu phần mô tả",
  "invalid-number":
    "số liệu không hợp lệ (chỉ chữ số, dấu chấm hoặc phẩy thập phân, không có dấu phân cách hàng nghìn)",
} as const;

const AI_COMPANY_FIELDS = [
  "name",
  "taxCode",
  "address",
  "reportPeriod",
  "reportYear",
  "reportScope",
  ...PROFILE_FIELDS,
] as const;

const PLAIN_FIELDS: readonly string[] = [
  "name",
  "taxCode",
  "address",
  "reportPeriod",
  "reportYear",
  "reportScope",
];

const text = z
  .union([z.string(), z.number()])
  .nullish()
  .transform((value) => (value === null || value === undefined ? "" : String(value).trim()));

const evidenceSchema = z.object({ quote: text, url: text, page: text });

const answerEntrySchema = z.object({
  id: text,
  value: text,
  number: text,
  note: text,
  quote: text,
  url: text,
  page: text,
});

export const aiResultSchema = z.object({
  company: z.record(z.string(), text).optional(),
  evidence: z.record(z.string(), evidenceSchema).optional(),
  answers: z.array(answerEntrySchema).optional(),
});

export type AiResult = z.infer<typeof aiResultSchema>;

export interface BuildDraftInput {
  readonly results: readonly AiResult[];
  readonly survey: Survey;
  readonly pages: readonly SourcePage[] | null;
  readonly sourceLabel: string;
  readonly name: string;
  readonly industry: string;
  readonly headcount: string;
  readonly year: string;
}

export interface BuildDraftOutput {
  readonly content: DraftContent;
  readonly company: ReviewRow[];
  readonly answers: ReviewRow[];
  readonly defaults: ReviewRow[];
  readonly rejected: string[];
  readonly totalQuestions: number;
  readonly verifiedCount: number;
}

function flagsOf(checked: CheckState): string[] {
  if (checked === "ok") {
    return ["Đã đối chiếu với PDF"];
  }
  if (checked === "fail") {
    return ["Trích dẫn không có trong PDF"];
  }
  return [];
}

function toRow(row: Omit<ReviewRow, "flags">): ReviewRow {
  return { ...row, flags: flagsOf(row.checked) };
}

export function buildDraft(input: BuildDraftInput): BuildDraftOutput {
  const questions = new Map<string, Question>();
  for (const pillar of input.survey) {
    for (const group of pillar.groups) {
      for (const question of group.questions) {
        questions.set(question.id, question);
      }
    }
  }

  const company: Record<string, string> = { ...COMPANY_INITIAL_VALUES };
  company["name"] = input.name;
  company["industry"] = input.industry;
  company["headcount"] = input.headcount;
  company["reportYear"] = input.year;

  const companyRows: ReviewRow[] = [];
  const answerRows: ReviewRow[] = [];
  const rejected: string[] = [];
  const answers: Record<string, DraftAnswer> = {};
  const pages = input.pages;

  for (const result of input.results) {
    for (const field of AI_COMPANY_FIELDS) {
      const value = result.company?.[field];
      if (value === undefined || value === "") {
        continue;
      }
      if (field === "reportPeriod" && !REPORT_PERIODS.some((period) => period === value)) {
        rejected.push(`Hồ sơ "${COMPANY_FIELD_LABELS[field]}": giá trị "${value}" không hợp lệ`);
        continue;
      }
      if (field === "reportYear" && !/^\d{4}$/.test(value)) {
        rejected.push(`Hồ sơ "${COMPANY_FIELD_LABELS[field]}": "${value}" không phải năm`);
        continue;
      }
      if (!PLAIN_FIELDS.includes(field)) {
        const check = profileSchema.shape[field as keyof typeof profileSchema.shape].safeParse(value);
        if (!check.success) {
          rejected.push(`Hồ sơ "${COMPANY_FIELD_LABELS[field]}": "${value}" không hợp lệ`);
          continue;
        }
      }
      company[field] = value;
      const evidence = result.evidence?.[field];
      const found =
        pages !== null && evidence !== undefined && evidence.quote !== ""
          ? locateQuote(pages, evidence.quote)
          : null;
      const checked: CheckState =
        pages === null || evidence === undefined || evidence.quote === ""
          ? "none"
          : found === null
            ? "fail"
            : "ok";
      companyRows.push(
        toRow({
          key: field,
          label: COMPANY_FIELD_LABELS[field satisfies CompanyField],
          shown: value,
          quote: evidence?.quote ?? "",
          url: input.sourceLabel,
          page: found !== null ? String(found) : "",
          checked,
        }),
      );
    }

    for (const entry of result.answers ?? []) {
      const question = questions.get(entry.id);
      if (question === undefined) {
        rejected.push(`${entry.id}: mã câu không có trong bộ câu hỏi của ngành và quy mô này`);
        continue;
      }
      const choices = getAnswerChoices(question.inputType).map((choice) => choice.value);
      if (!choices.includes(entry.value)) {
        rejected.push(`${entry.id}: lựa chọn "${entry.value}" không hợp lệ`);
        continue;
      }
      const issues = getAnswerIssues(question, {
        value: entry.value,
        number: entry.number,
        description: entry.note,
      });
      if (issues.length > 0) {
        rejected.push(`${entry.id}: ${issues.map((issue) => ISSUE_LABELS[issue]).join("; ")}`);
        continue;
      }
      const numeric = question.inputType === "NUMBER" || question.inputType === "INTEGER";
      const hasNumber =
        numeric && entry.value === "known" && isValidNumber(entry.number, question.inputType);
      const number = hasNumber ? entry.number : "";

      let page = "";
      let checked: CheckState = "none";
      if (pages !== null && QUOTE_REQUIRED.has(entry.value)) {
        const found = entry.quote === "" ? null : locateQuote(pages, entry.quote);
        if (found === null) {
          rejected.push(`${entry.id}: trích dẫn không có trong PDF (có thể AI tự sinh)`);
          continue;
        }
        if (hasNumber && !quoteContainsNumber(entry.quote, number)) {
          rejected.push(`${entry.id}: số liệu ${number} không nằm trong đoạn trích dẫn`);
          continue;
        }
        page = String(found);
        checked = "ok";
      }

      answers[entry.id] = { value: entry.value, number, description: entry.note };
      const unit = question.unit === "" || number === "" ? "" : ` ${question.unit}`;
      answerRows.push(
        toRow({
          key: entry.id,
          label: question.text,
          shown: `${entry.value}${number === "" ? "" : ` · ${number}${unit}`}${entry.note === "" ? "" : ` · ${entry.note}`}`,
          quote: entry.quote,
          url: input.sourceLabel,
          page,
          checked,
        }),
      );
    }
  }

  const defaultRows: ReviewRow[] = [];
  for (const [id, question] of questions) {
    if (answers[id] !== undefined) {
      continue;
    }
    const fallback = negativeDefault(question);
    const choice = getAnswerChoices(question.inputType).find(
      (item) => item.value === fallback.value,
    );
    if (getAnswerIssues(question, fallback).length > 0 || choice === undefined) {
      continue;
    }
    answers[id] = fallback;
    defaultRows.push({
      key: id,
      label: question.text,
      shown: `${choice.label}${fallback.description === "" ? "" : ` · ${fallback.description}`}`,
      quote: "",
      url: "",
      page: "",
      checked: "none",
      flags: ["Tự chọn phủ định vì AI không tìm thấy trong báo cáo"],
    });
  }

  return {
    content: { company, answers, activeGroupId: null },
    company: companyRows,
    answers: answerRows,
    defaults: defaultRows,
    rejected,
    totalQuestions: questions.size,
    verifiedCount: answerRows.filter((row) => row.checked === "ok").length,
  };
}
