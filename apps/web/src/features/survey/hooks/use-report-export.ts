import { useState } from "react";

import type { CompanyFormValues } from "@/features/company";
import { downloadBlob } from "@/lib/download-blob";

import { buildReportFileName } from "../lib/report-file-name";
import { validateReport } from "../lib/report-validation";
import type { ReportValidation } from "../lib/report-validation";
import { createReportBlob } from "../report/create-report";
import type { AnswerMap, GroupEntry } from "../types";

interface UseReportExportInput {
  company: CompanyFormValues;
  entries: readonly GroupEntry[];
  answers: AnswerMap;
  logo: File | null;
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
  logo,
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
      const blob = await createReportBlob({ company, entries, answers, logo });
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
