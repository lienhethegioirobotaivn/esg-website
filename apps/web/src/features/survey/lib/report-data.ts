import type { AnswerValue } from "@esg/shared";

import { REPORT_PERIOD_OPTIONS } from "@/features/company";
import type { CompanyFormValues } from "@/features/company";
import { formatFileSize } from "@/lib/format";

import { ANSWER_OPTIONS, ASPECT_LABELS } from "../constants";
import { getDraft } from "./progress";
import type { AnswerMap, GroupEntry } from "../types";

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
  readonly status: AnswerValue | null;
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
}

export interface OptionLookup {
  readonly value: string;
  readonly label: string;
}

function getStatusLabel(status: AnswerValue | null): string {
  if (status === null) {
    return "Chưa trả lời";
  }
  return ANSWER_OPTIONS.find((option) => option.value === status)?.label ?? status;
}

export function emptyCounts(): StatusCounts {
  return { implemented: 0, in_progress: 0, not_implemented: 0, unanswered: 0, total: 0 };
}

export function addToCounts(
  counts: StatusCounts,
  status: AnswerValue | null,
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
        groupCounts = addToCounts(groupCounts, draft.value);
        const aspect = ASPECT_LABELS[question.aspect];
        aspectCounts.set(
          aspect,
          addToCounts(aspectCounts.get(aspect) ?? emptyCounts(), draft.value),
        );
        const isImplemented = draft.value === "implemented";
        return {
          number: questionIndex + 1,
          text: question.text,
          aspect,
          status: draft.value,
          statusLabel: getStatusLabel(draft.value),
          description: isImplemented ? draft.description.trim() : "",
          evidence: isImplemented
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

    const open = questions.filter((question) => question.status !== "implemented");
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
      counts: groups.reduce((sum, group) => mergeCounts(sum, group.counts), emptyCounts()),
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
    aspects: [...aspectCounts.entries()].map(([label, counts]) => ({ label, counts })),
    improvements: improvementMap,
  };
}
