import { buildReportModel } from "@esg/shared";
import type { ReportAnswerInput, Survey } from "@esg/shared";

import { getReportCode } from "@/features/company";
import type { CompanyFormValues } from "@/features/company";

import { loadPlan } from "../lib/plan-storage";
import { getDraft } from "../lib/progress";
import { getReportDraftState } from "../lib/report-draft-state";
import type { AnswerMap, GroupEntry } from "../types";
import { collectEvidenceImages } from "./report-images";
import { prepareReportLogo } from "./report-logo";

const CONTENT_VERSION = "Bộ câu hỏi ESG v0.1";

interface CreateReportInput {
  company: CompanyFormValues;
  entries: readonly GroupEntry[];
  answers: AnswerMap;
  draftNotice?: string | null;
  logo?: File | null;
}

export function toSurvey(entries: readonly GroupEntry[]): Survey {
  const pillars: Survey = [];
  entries.forEach((entry) => {
    const existing = pillars.find((pillar) => pillar.id === entry.pillarId);
    if (existing) {
      existing.groups.push(entry.group);
      return;
    }
    pillars.push({
      id: entry.pillarId,
      name: entry.pillarName,
      icon: entry.pillarIcon,
      order: pillars.length + 1,
      groups: [entry.group],
    });
  });
  return pillars;
}

export function toReportAnswers(
  entries: readonly GroupEntry[],
  answers: AnswerMap,
): Record<string, ReportAnswerInput> {
  const result: Record<string, ReportAnswerInput> = {};
  for (const entry of entries) {
    for (const question of entry.group.questions) {
      const draft = getDraft(answers, question.id);
      result[question.id] = {
        value: draft.value,
        number: draft.number,
        description: draft.description,
        evidence: draft.evidence.map((item) => ({
          name: item.file.name,
          mimeType: item.file.type,
        })),
      };
    }
  }
  return result;
}

async function prepareReport(input: CreateReportInput) {
  const { company, entries, answers } = input;
  const { isDraft } = getReportDraftState({ company, entries, answers });

  const model = buildReportModel({
    survey: toSurvey(entries),
    company,
    answers: toReportAnswers(entries, answers),
    reportCode: getReportCode(),
    generatedAt: new Date().toISOString(),
    contentVersion: CONTENT_VERSION,
    isDraft,
    plan: loadPlan(),
  });
  const logo = input.logo
    ? await prepareReportLogo(input.logo).catch(() => null)
    : null;
  const images = await collectEvidenceImages(entries, answers);
  return { model, logo, images, draftNotice: input.draftNotice ?? null };
}

export async function createReportBlob(
  input: CreateReportInput,
): Promise<Blob> {
  const prepared = await prepareReport(input);
  const { generateReportBlob } = await import("./generate-report");
  return generateReportBlob(prepared);
}

export async function createReportDocxBlob(
  input: CreateReportInput,
): Promise<Blob> {
  const prepared = await prepareReport(input);
  const { generateReportDocx } = await import("./generate-docx");
  return generateReportDocx(prepared);
}
