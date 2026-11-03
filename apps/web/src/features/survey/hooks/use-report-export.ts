import { useState } from "react";

import { getReportCode, saveCompany, saveReportCode } from "@/features/company";
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
    setIsExporting(true);
    setError(null);
    setValidation(null);
    try {
      const result = validateReport({ company, entries, answers });
      let saveFailed = false;
      if (result.companyIssues.length === 0) {
        try {
          const saved = await saveCompany({
            values: company,
            logo,
            reportCode: getReportCode(),
          });
          saveReportCode(saved.reportCode);
        } catch {
          saveFailed = true;
        }
      }

      if (!result.isValid) {
        setValidation(result);
        if (saveFailed) {
          setError("Chưa lưu được thông tin doanh nghiệp. Vui lòng thử lại.");
        }
        return;
      }

      const blob = await createReportBlob({ company, entries, answers, logo });
      downloadBlob(blob, buildReportFileName(company));
      if (saveFailed) {
        setError(
          "Đã tạo báo cáo nhưng chưa lưu được thông tin doanh nghiệp. Vui lòng thử lại.",
        );
      }
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
