"use client";

import { ExternalLink } from "lucide-react";

import { Button, Modal } from "@/components/ui";
import { useT } from "@/features/locale";

import type { ReportPreview } from "../hooks/use-report-preview";

interface ReportPreviewDialogProps {
  preview: ReportPreview;
  onClose: () => void;
}

export function ReportPreviewDialog({
  preview,
  onClose,
}: ReportPreviewDialogProps) {
  const t = useT();
  return (
    <Modal title={t("Bản nháp báo cáo")} onClose={onClose} size="lg">
      <p className="mb-3 text-sm text-muted">
        {preview.missingCount === 0
          ? t("Đây là file PDF sẽ được xuất. Thông tin đã đầy đủ.")
          : t(
              "Đây là file PDF sẽ được xuất. Còn {count} mục chưa hoàn thành, các mục này sẽ hiện là chưa trả lời.",
              { count: preview.missingCount },
            )}
      </p>
      <iframe
        title={t("Bản xem trước báo cáo PDF")}
        src={preview.url}
        className="min-h-0 w-full flex-1 border border-border bg-surface-muted"
      />
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <a
          href={preview.url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-sm text-primary-700 underline"
        >
          <ExternalLink aria-hidden className="size-4" />
          {t("Mở trong tab mới")}
        </a>
        <Button variant="secondary" onClick={onClose}>
          {t("Đóng")}
        </Button>
      </div>
    </Modal>
  );
}
