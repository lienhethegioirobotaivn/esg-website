import { buildReportSnapshot } from "@esg/shared";
import { useRef, useState } from "react";

import { getReportCode, saveCompany, saveReportCode } from "@/features/company";
import type { CompanyFormValues } from "@/features/company";
import { useLocale, useT } from "@/features/locale";
import { downloadBlob } from "@/lib/download-blob";

import { buildArchiveKey } from "../lib/archive-key";
import { loadBrandTheme } from "../lib/brand-theme-storage";
import { toDraftAnswers } from "../lib/draft-state";
import { loadPlan } from "../lib/plan-storage";
import { linkReportOwner } from "../lib/link-owner";
import { archiveReport } from "../lib/report-archive";
import { getReportDraftState } from "../lib/report-draft-state";
import { buildReportFileName } from "../lib/report-file-name";
import type { ReportFormat } from "../lib/report-file-name";
import { validateReport } from "../lib/report-validation";
import type { ReportValidation } from "../lib/report-validation";
import { postReportAttach } from "../services/report-archive.service";
import type { ReportFinishResult } from "../services/report-archive.service";
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
  linkEmail: () => Promise<void>;
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
  const t = useT();
  const locale = useLocale();
  const [isExporting, setIsExporting] = useState(false);
  const [exportingFormat, setExportingFormat] = useState<ReportFormat | null>(null);
  const [isDownloadOpen, setIsDownloadOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validation, setValidation] = useState<ReportValidation | null>(null);
  const blobs = useRef<Partial<Record<ReportFormat, Promise<Blob>>>>({});
  const blobsKey = useRef<string | null>(null);
  const archived = useRef<{ key: string; result: ReportFinishResult } | null>(null);

  function currentKey(): string {
    return buildArchiveKey({
      company,
      answers,
      plan: loadPlan(),
      theme: loadBrandTheme(),
      locale,
      logo,
    });
  }

  function getBlob(format: ReportFormat): Promise<Blob> {
    const key = currentKey();
    if (blobsKey.current !== key) {
      blobs.current = {};
      blobsKey.current = key;
    }
    const cached = blobs.current[format];
    if (cached) {
      return cached;
    }
    const input = { company, entries, answers, logo, t, locale };
    const created =
      format === "docx" ? createReportDocxBlob(input) : createReportBlob(input);
    blobs.current[format] = created;
    created.catch(() => {
      if (blobs.current[format] === created) {
        delete blobs.current[format];
      }
    });
    return created;
  }

  async function archive(force: boolean): Promise<ReportFinishResult | null> {
    const key = currentKey();
    if (!force && archived.current !== null && archived.current.key === key) {
      return archived.current.result;
    }
    try {
      const reportCode = getReportCode();
      if (reportCode === null) {
        throw new Error("Chưa có mã báo cáo.");
      }
      const pdf = await getBlob("pdf");
      const docx = await getBlob("docx");
      const draftState = getReportDraftState({ company, entries, answers }, t);
      const theme = loadBrandTheme();
      const result = await archiveReport({
        reportCode,
        files: [
          { format: "pdf", name: buildReportFileName(company, "pdf"), blob: pdf },
          { format: "docx", name: buildReportFileName(company, "docx"), blob: docx },
        ],
        locale,
        isDraft: draftState.isDraft,
        isBrandTheme: !theme.isDefault,
        companyName: company.name,
        snapshot: buildReportSnapshot({
          company,
          answers: toDraftAnswers(answers),
          plan: loadPlan(),
          theme,
          locale,
          savedAt: new Date().toISOString(),
        }),
      });
      archived.current = { key, result };
      return result;
    } catch {
      return null;
    }
  }

  async function linkEmail() {
    const current = archived.current;
    const token = current?.result.attachToken ?? null;
    await linkReportOwner({
      attach:
        current !== null && token !== null
          ? () =>
              postReportAttach({
                exportId: current.result.exportId,
                attachToken: token,
              })
          : null,
      rearchive: () => archive(true),
    });
  }

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
          setError(t("Chưa lưu được thông tin doanh nghiệp. Vui lòng thử lại."));
        }
        return;
      }

      await archive(false);
      setIsDownloadOpen(true);
      if (saveFailed) {
        setError(
          t(
            "Chưa lưu được thông tin doanh nghiệp. Vui lòng thử lại sau khi tải.",
          ),
        );
      }
    } catch {
      setError(t("Không kiểm tra được báo cáo. Vui lòng thử lại."));
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
      const blob = await getBlob(format);
      downloadBlob(blob, buildReportFileName(company, format));
    } catch {
      setError(
        format === "docx"
          ? t("Không tạo được file Word. Vui lòng thử lại.")
          : t("Không tạo được file PDF. Vui lòng thử lại."),
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
    linkEmail,
    isExporting,
    error,
    validation,
    closeValidation: () => setValidation(null),
  };
}
