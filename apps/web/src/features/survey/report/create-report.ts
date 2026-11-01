import { headcountOptions, industryOptions } from "@/data";
import type { CompanyFormValues } from "@/features/company";

import { buildReportData } from "../lib/report-data";
import type { AnswerMap, GroupEntry } from "../types";

interface CreateReportInput {
  company: CompanyFormValues;
  entries: readonly GroupEntry[];
  answers: AnswerMap;
  draftNotice?: string | null;
}

export async function createReportBlob(
  input: CreateReportInput,
): Promise<Blob> {
  const data = buildReportData({
    company: input.company,
    entries: input.entries,
    answers: input.answers,
    exportedAt: new Date().toISOString(),
    industryOptions,
    headcountOptions,
    draftNotice: input.draftNotice ?? null,
  });
  const { generateReportBlob } = await import("./generate-report");
  return generateReportBlob(data);
}
