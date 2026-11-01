import { Eye, FileDown } from "lucide-react";

import { Button } from "@/components/ui";

interface ReportActionsProps {
  onPreview: () => void;
  onExport: () => void;
  isPreviewLoading: boolean;
  isExporting: boolean;
  error: string | null;
  disabled?: boolean;
}

export function ReportActions({
  onPreview,
  onExport,
  isPreviewLoading,
  isExporting,
  error,
  disabled = false,
}: ReportActionsProps) {
  return (
    <div className="sticky bottom-0 z-30 -mx-5 mt-6 border-t border-border-strong bg-surface px-5 py-3 sm:-mx-8 sm:px-8 lg:-mx-10 lg:px-10">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end sm:gap-4">
        {error ? (
          <p role="alert" className="text-xs text-danger-600 sm:mr-auto">
            {error}
          </p>
        ) : null}
        <div className="flex gap-2">
          <Button
            variant="secondary"
            className="flex-1 sm:flex-none"
            onClick={onPreview}
            disabled={disabled || isPreviewLoading}
            leadingIcon={<Eye aria-hidden className="size-4" />}
          >
            {isPreviewLoading ? "Đang tạo bản xem trước..." : "Xem bản nháp"}
          </Button>
          <Button
            className="flex-1 sm:flex-none"
            onClick={onExport}
            disabled={disabled || isExporting}
            leadingIcon={<FileDown aria-hidden className="size-4" />}
          >
            {isExporting ? "Đang tạo file PDF..." : "Tạo báo cáo"}
          </Button>
        </div>
      </div>
    </div>
  );
}
