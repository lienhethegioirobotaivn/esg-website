"use client";

import { FileDown, FileText, Info, LoaderCircle } from "lucide-react";

import { Button, Modal } from "@/components/ui";

import type { DraftJumpTarget, DraftReason } from "../lib/report-draft-state";
import type { ReportFormat } from "../lib/report-file-name";

interface ReportDownloadDialogProps {
  isDraft: boolean;
  reasons: readonly DraftReason[];
  onJump: (target: DraftJumpTarget) => void;
  exportingFormat: ReportFormat | null;
  error: string | null;
  onDownload: (format: ReportFormat) => void;
  onClose: () => void;
}

export function ReportDownloadDialog({
  isDraft,
  reasons,
  onJump,
  exportingFormat,
  error,
  onDownload,
  onClose,
}: ReportDownloadDialogProps) {
  const busy = exportingFormat !== null;
  return (
    <Modal title="Tải báo cáo" onClose={onClose}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted">Bạn có thể tải cả hai định dạng.</p>
        {isDraft ? (
          <span className="rounded-full bg-warning-50 px-3 py-1 text-xs font-medium text-warning-600">
            Bản nháp
          </span>
        ) : null}
      </div>

      <div className="mt-5 space-y-5">
        <div>
          <Button
            className="w-full"
            disabled={busy}
            onClick={() => onDownload("pdf")}
            leadingIcon={
              exportingFormat === "pdf" ? (
                <LoaderCircle aria-hidden className="size-4 animate-spin" />
              ) : (
                <FileDown aria-hidden className="size-4" />
              )
            }
          >
            {exportingFormat === "pdf" ? "Đang tạo PDF..." : "Tải xuống PDF"}
          </Button>
          <p className="mt-1.5 text-xs text-muted">
            Giữ nguyên bố cục, phù hợp để in và chia sẻ.
          </p>
        </div>
        <div>
          <Button
            variant="secondary"
            className="w-full"
            disabled={busy}
            onClick={() => onDownload("docx")}
            leadingIcon={
              exportingFormat === "docx" ? (
                <LoaderCircle aria-hidden className="size-4 animate-spin" />
              ) : (
                <FileText aria-hidden className="size-4" />
              )
            }
          >
            {exportingFormat === "docx" ? "Đang tạo Word..." : "Tải xuống Word"}
          </Button>
          <p className="mt-1.5 text-xs text-muted">
            Định dạng .docx để tiếp tục chỉnh sửa. Bố cục đơn giản hơn bản PDF
            và không có biểu đồ.
          </p>
        </div>
      </div>

      {isDraft ? (
        <div
          role="note"
          className="mt-5 flex gap-3 rounded-card border border-warning-600/40 bg-warning-50 px-4 py-3 text-sm"
        >
          <Info
            aria-hidden
            className="mt-0.5 size-4 shrink-0 text-warning-600"
          />
          <div>
            <p className="font-medium">Báo cáo này sẽ mang chữ “Bản nháp”</p>
            <p className="mt-0.5 text-muted">
              Bạn vẫn tải được. Chữ “Bản nháp” sẽ biến mất khi bạn xử lý xong:
            </p>
            <ul className="mt-1 list-disc space-y-0.5 pl-5 text-muted">
              {reasons.map((reason) => (
                <li key={reason.text}>
                  {reason.text}{" "}
                  <button
                    type="button"
                    onClick={() => onJump(reason.target)}
                    className="font-medium text-primary-700 underline underline-offset-2 hover:text-primary-900"
                  >
                    Đi tới đây
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="mt-4 text-xs text-danger-600">
          {error}
        </p>
      ) : null}

      <div className="mt-5 border-t border-border pt-4">
        <Button
          variant="secondary"
          className="w-full"
          disabled={busy}
          onClick={onClose}
        >
          Quay lại chỉnh sửa
        </Button>
        <p className="mt-3 text-xs text-muted">
          Hồ sơ tự khai, chưa được thẩm định độc lập.
        </p>
      </div>
    </Modal>
  );
}
