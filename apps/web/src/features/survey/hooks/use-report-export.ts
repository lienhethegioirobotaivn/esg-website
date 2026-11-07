import { useState } from "react";

import { getReportCode, saveCompany, saveReportCode } from "@/features/company";
import type { CompanyFormValues } from "@/features/company";
import { downloadBlob } from "@/lib/download-blob";

import { buildReportFileName } from "../lib/report-file-name";
import type { ReportFormat } from "../lib/report-file-name";
import { validateReport } from "../lib/report-validation";
import type { ReportValidation } from "../lib/report-validation";
import { createReportBlob, createReportDocxBlob } from "../report/create-report";
import type { AnswerMap, GroupEntry } from "../types";

interface UseReportExportInput {
  company: CompanyFormValues;
  entries: readonly GroupEntry[];
  answers: AnswerMap;
  logo: File | null;
}

interface ReportExport {
  exportReport: () => Promise<void>;
  downloadReport: (format: ReportFormat) => Promise<void>;
  isExporting: boolean;
  exportingFormat: ReportFormat | null;
  isDownloadOpen: boolean;
  closeDownload: () => void;
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
  const [exportingFormat, setExportingFormat] = useState<ReportFormat | null>(null);
  const [isDownloadOpen, setIsDownloadOpen] = useState(false);
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

      setIsDownloadOpen(true);
      if (saveFailed) {
        setError(
          "Chưa lưu được thông tin doanh nghiệp. Vui lòng thử lại sau khi tải.",
        );
      }
    } catch {
      setError("Không kiểm tra được báo cáo. Vui lòng thử lại.");
    } finally {
      setIsExporting(false);
    }
  }

  async function downloadReport(format: ReportFormat) {
    if (exportingFormat !== null) {
      return;
    }
    setExportingFormat(format);
    setError(null);
    try {
      const input = { company, entries, answers, logo };
      const blob =
        format === "docx"
          ? await createReportDocxBlob(input)
          : await createReportBlob(input);
      downloadBlob(blob, buildReportFileName(company, format));
    } catch {
      setError(
        format === "docx"
          ? "Không tạo được file Word. Vui lòng thử lại."
          : "Không tạo được file PDF. Vui lòng thử lại.",
      );
    } finally {
      setExportingFormat(null);
    }
  }

  return {
    exportReport,
    downloadReport,
    exportingFormat,
    isDownloadOpen,
    closeDownload: () => setIsDownloadOpen(false),
    isExporting,
    error,
    validation,
    closeValidation: () => setValidation(null),
  };
}
