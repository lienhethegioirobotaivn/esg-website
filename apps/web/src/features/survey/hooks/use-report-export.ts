import { useState } from "react";

import type { CompanyFormValues } from "@/features/company";
import { headcountOptions, industryOptions } from "@/data";
import { downloadBlob } from "@/lib/download-blob";

import { buildReportData } from "../lib/report-data";
import { buildReportFileName } from "../lib/report-file-name";
import { validateReport } from "../lib/report-validation";
import type { ReportValidation } from "../lib/report-validation";
import type { AnswerMap, GroupEntry } from "../types";

interface UseReportExportInput {
  company: CompanyFormValues;
  entries: readonly GroupEntry[];
  answers: AnswerMap;
}

interface ReportExport {
  exportReport: () => Promise<void>;
  isExporting: boolean;
  error: string | null;
  validation: ReportValidation | null;
  closeValidation: () => void;
}

export function useReportExport({
  company,
  entries,
  answers,
}: UseReportExportInput): ReportExport {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validation, setValidation] = useState<ReportValidation | null>(null);

  async function exportReport() {
    if (isExporting) {
      return;
    }
    const result = validateReport({ company, entries, answers });
    if (!result.isValid) {
      setError(null);
      setValidation(result);
      return;
    }

    setValidation(null);
    setError(null);
    setIsExporting(true);
    try {
      const data = buildReportData({
        company,
        entries,
        answers,
        exportedAt: new Date().toISOString(),
        industryOptions,
        headcountOptions,
      });
      const { generateReportBlob } = await import("../report/generate-report");
      const blob = await generateReportBlob(data);
      downloadBlob(blob, buildReportFileName(company));
    } catch {
      setError("Không tạo được file PDF. Vui lòng thử lại.");
    } finally {
      setIsExporting(false);
    }
  }

  return {
    exportReport,
    isExporting,
    error,
    validation,
    closeValidation: () => setValidation(null),
  };
}
