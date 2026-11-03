import { buildReportModel } from "@esg/shared";
import type { ReportAnswerInput, Survey } from "@esg/shared";

import { getReportCode } from "@/features/company";
import type { CompanyFormValues } from "@/features/company";

import { getDraft } from "../lib/progress";
import { validateReport } from "../lib/report-validation";
import type { AnswerMap, GroupEntry } from "../types";
import { collectEvidenceImages } from "./report-images";
import { prepareReportLogo } from "./report-logo";

const CONTENT_VERSION = "Bộ câu hỏi ESG v0.1";
const CONFIRMATION_QUESTION_ID = "C-060";

interface CreateReportInput {
  company: CompanyFormValues;
  entries: readonly GroupEntry[];
  answers: AnswerMap;
  draftNotice?: string | null;
  logo?: File | null;
}

function toSurvey(entries: readonly GroupEntry[]): Survey {
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

function toReportAnswers(
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

export async function createReportBlob(
  input: CreateReportInput,
): Promise<Blob> {
  const { company, entries, answers } = input;
  const validation = validateReport({ company, entries, answers });
  const confirmationApplies = entries.some((entry) =>
    entry.group.questions.some((question) => question.id === CONFIRMATION_QUESTION_ID),
  );
  const confirmed = getDraft(answers, CONFIRMATION_QUESTION_ID).value === "yes";
  const isDraft = !validation.isValid || (confirmationApplies && !confirmed);

  const model = buildReportModel({
    survey: toSurvey(entries),
    company,
    answers: toReportAnswers(entries, answers),
    reportCode: getReportCode(),
    generatedAt: new Date().toISOString(),
    contentVersion: CONTENT_VERSION,
    isDraft,
  });
  const logo = input.logo
    ? await prepareReportLogo(input.logo).catch(() => null)
    : null;
  const images = await collectEvidenceImages(entries, answers);
  const { generateReportBlob } = await import("./generate-report");
  return generateReportBlob({
    model,
    logo,
    images,
    draftNotice: input.draftNotice ?? null,
  });
}
