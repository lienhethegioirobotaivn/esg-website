import { useState } from "react";

import type { CompanyFormValues } from "@/features/company";

import { validateReport } from "../lib/report-validation";
import { createReportBlob } from "../report/create-report";
import type { AnswerMap, GroupEntry } from "../types";

interface UseReportPreviewInput {
  company: CompanyFormValues;
  entries: readonly GroupEntry[];
  answers: AnswerMap;
  logo: File | null;
}

export interface ReportPreview {
  url: string;
  missingCount: number;
}

interface ReportPreviewState {
  openPreview: () => Promise<void>;
  closePreview: () => void;
  preview: ReportPreview | null;
  isLoading: boolean;
  error: string | null;
}

export function useReportPreview({
  company,
  entries,
  answers,
  logo,
}: UseReportPreviewInput): ReportPreviewState {
  const [preview, setPreview] = useState<ReportPreview | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function openPreview() {
    if (isLoading) {
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const validation = validateReport({ company, entries, answers });
      const missingCount =
        validation.companyIssues.length + validation.questionIssues.length;
      const draftNotice =
        missingCount === 0
          ? null
          : `Còn ${missingCount} mục chưa hoàn thành, nội dung có thể thay đổi khi bạn điền thêm.`;
      const blob = await createReportBlob({
        company,
        entries,
        answers,
        draftNotice,
        logo,
      });
      setPreview((current) => {
        if (current) {
          URL.revokeObjectURL(current.url);
        }
        return { url: URL.createObjectURL(blob), missingCount };
      });
    } catch {
      setError("Không tạo được bản xem trước. Vui lòng thử lại.");
    } finally {
      setIsLoading(false);
    }
  }

  function closePreview() {
    setPreview((current) => {
      if (current) {
        URL.revokeObjectURL(current.url);
      }
      return null;
    });
  }

  return { openPreview, closePreview, preview, isLoading, error };
}
