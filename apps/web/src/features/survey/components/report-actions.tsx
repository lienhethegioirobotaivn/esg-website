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
    <div className="flex shrink-0 flex-col gap-2 md:items-end">
      <div className="flex flex-wrap gap-2">
        <Button
          variant="secondary"
          className="flex-1 md:flex-none"
          onClick={onPreview}
          disabled={disabled || isPreviewLoading}
          leadingIcon={<Eye aria-hidden className="size-4" />}
        >
          {isPreviewLoading ? "Đang tạo bản xem trước..." : "Xem bản nháp"}
        </Button>
        <Button
          className="flex-1 md:flex-none"
          onClick={onExport}
          disabled={disabled || isExporting}
          leadingIcon={<FileDown aria-hidden className="size-4" />}
        >
          {isExporting ? "Đang tạo file PDF..." : "Tạo báo cáo"}
        </Button>
      </div>
      {error ? (
        <p role="alert" className="text-xs text-danger-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}
