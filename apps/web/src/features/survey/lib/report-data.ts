import { getAnswerFields, getChoiceLabel } from "@esg/shared";
import type { Question } from "@esg/shared";

import { REPORT_PERIOD_OPTIONS } from "@/features/company";
import type { CompanyFormValues } from "@/features/company";
import { formatFileSize } from "@/lib/format";

import { getDraft } from "./progress";
import type { AnswerDraft, AnswerMap, GroupEntry } from "../types";

export type ReportBucket = "implemented" | "in_progress" | "not_implemented";

export interface StatusCounts {
  readonly implemented: number;
  readonly in_progress: number;
  readonly not_implemented: number;
  readonly unanswered: number;
  readonly total: number;
}

export interface ReportEvidence {
  readonly name: string;
  readonly size: string;
}

export interface ReportQuestion {
  readonly number: number;
  readonly text: string;
  readonly aspect: string;
  readonly status: ReportBucket | null;
  readonly counted: boolean;
  readonly statusLabel: string;
  readonly description: string;
  readonly evidence: readonly ReportEvidence[];
}

export interface ReportGroup {
  readonly position: number;
  readonly title: string;
  readonly counts: StatusCounts;
  readonly questions: readonly ReportQuestion[];
}

export interface ReportPillar {
  readonly name: string;
  readonly counts: StatusCounts;
  readonly groups: readonly ReportGroup[];
}

export interface ReportAspect {
  readonly label: string;
  readonly counts: StatusCounts;
}

export interface ReportImprovementGroup {
  readonly pillarName: string;
  readonly groupPosition: number;
  readonly groupTitle: string;
  readonly items: readonly ReportQuestion[];
}

export interface ReportCompany {
  readonly name: string;
  readonly industry: string;
  readonly headcount: string;
  readonly address: string;
  readonly period: string;
  readonly year: string;
  readonly scope: string;
}

export interface ReportData {
  readonly exportedAt: string;
  readonly company: ReportCompany;
  readonly totals: StatusCounts;
  readonly pillars: readonly ReportPillar[];
  readonly aspects: readonly ReportAspect[];
  readonly improvements: readonly ReportImprovementGroup[];
  readonly draftNotice: string | null;
}

export interface OptionLookup {
  readonly value: string;
  readonly label: string;
}

function getBucket(question: Question, draft: AnswerDraft): ReportBucket | null {
  if (question.inputType !== "PRACTICE") {
    return null;
  }
  switch (draft.value) {
    case "yes":
      return "implemented";
    case "partial":
      return "in_progress";
    case "no":
    case "unknown":
      return "not_implemented";
    default:
      return null;
  }
}

function isCounted(question: Question, draft: AnswerDraft): boolean {
  return question.inputType === "PRACTICE" && draft.value !== "na";
}

function getStatusLabel(question: Question, draft: AnswerDraft): string {
  return (
    getChoiceLabel(question.inputType, draft.value) ?? "Chưa trả lời"
  );
}

function getDetailText(question: Question, draft: AnswerDraft): string {
  const fields = getAnswerFields(question.inputType, draft.value);
  const parts: string[] = [];
  if (fields.numberInput && draft.number.trim() !== "") {
    const unit = question.unit === "" ? "" : ` ${question.unit}`;
    parts.push(`Số liệu: ${draft.number.trim()}${unit}`);
  }
  if (fields.detail !== "none" && draft.description.trim() !== "") {
    parts.push(draft.description.trim());
  }
  return parts.join(". ");
}

export function emptyCounts(): StatusCounts {
  return {
    implemented: 0,
    in_progress: 0,
    not_implemented: 0,
    unanswered: 0,
    total: 0,
  };
}

export function addToCounts(
  counts: StatusCounts,
  status: ReportBucket | null,
): StatusCounts {
  const key = status ?? "unanswered";
  return { ...counts, [key]: counts[key] + 1, total: counts.total + 1 };
}

export function mergeCounts(
  left: StatusCounts,
  right: StatusCounts,
): StatusCounts {
  return {
    implemented: left.implemented + right.implemented,
    in_progress: left.in_progress + right.in_progress,
    not_implemented: left.not_implemented + right.not_implemented,
    unanswered: left.unanswered + right.unanswered,
    total: left.total + right.total,
  };
}

export function toPercent(part: number, total: number): number {
  return total === 0 ? 0 : Math.round((part / total) * 100);
}

function findLabel(options: readonly OptionLookup[], value: string): string {
  return options.find((option) => option.value === value)?.label ?? value;
}

export function buildReportData(input: {
  company: CompanyFormValues;
  entries: readonly GroupEntry[];
  answers: AnswerMap;
  exportedAt: string;
  industryOptions: readonly OptionLookup[];
  headcountOptions: readonly OptionLookup[];
  draftNotice?: string | null;
}): ReportData {
  const { company, entries, answers } = input;

  const pillarOrder: string[] = [];
  const pillarGroups = new Map<string, ReportGroup[]>();
  const improvementMap: ReportImprovementGroup[] = [];
  const aspectCounts = new Map<string, StatusCounts>();
  let totals = emptyCounts();

  entries.forEach((entry, entryIndex) => {
    let groupCounts = emptyCounts();
    const questions: ReportQuestion[] = entry.group.questions.map(
      (question, questionIndex) => {
        const draft = getDraft(answers, question.id);
        const bucket = getBucket(question, draft);
        const counted = isCounted(question, draft);
        if (counted) {
          groupCounts = addToCounts(groupCounts, bucket);
          const topic = question.topic === "" ? "Khác" : question.topic;
          aspectCounts.set(
            topic,
            addToCounts(aspectCounts.get(topic) ?? emptyCounts(), bucket),
          );
        }
        const fields = getAnswerFields(question.inputType, draft.value);
        return {
          number: questionIndex + 1,
          text: question.text,
          aspect: question.topic,
          status: bucket,
          counted,
          statusLabel: getStatusLabel(question, draft),
          description: getDetailText(question, draft),
          evidence: fields.evidence
            ? draft.evidence.map((item) => ({
                name: item.file.name,
                size: formatFileSize(item.file.size),
              }))
            : [],
        };
      },
    );
    totals = mergeCounts(totals, groupCounts);

    if (!pillarGroups.has(entry.pillarName)) {
      pillarOrder.push(entry.pillarName);
      pillarGroups.set(entry.pillarName, []);
    }
    pillarGroups.get(entry.pillarName)?.push({
      position: entryIndex + 1,
      title: entry.group.title,
      counts: groupCounts,
      questions,
    });

    const open = questions.filter(
      (question) => question.counted && question.status !== "implemented",
    );
    if (open.length > 0) {
      improvementMap.push({
        pillarName: entry.pillarName,
        groupPosition: entryIndex + 1,
        groupTitle: entry.group.title,
        items: open,
      });
    }
  });

  const pillars: ReportPillar[] = pillarOrder.map((name) => {
    const groups = pillarGroups.get(name) ?? [];
    return {
      name,
      groups,
      counts: groups.reduce(
        (sum, group) => mergeCounts(sum, group.counts),
        emptyCounts(),
      ),
    };
  });

  return {
    exportedAt: input.exportedAt,
    company: {
      name: company.name.trim(),
      industry: findLabel(input.industryOptions, company.industry),
      headcount: findLabel(input.headcountOptions, company.headcount),
      address: company.address.trim(),
      period: findLabel(REPORT_PERIOD_OPTIONS, company.reportPeriod),
      year: company.reportYear,
      scope: company.reportScope.trim(),
    },
    totals,
    pillars,
    aspects: [...aspectCounts.entries()].map(([label, counts]) => ({
      label,
      counts,
    })),
    improvements: improvementMap,
    draftNotice: input.draftNotice ?? null,
  };
}
