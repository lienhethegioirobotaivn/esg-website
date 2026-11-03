import { Eye, FileDown } from "lucide-react";

import { Button } from "@/components/ui";

import type { ReportDraftState } from "../lib/report-draft-state";

interface ReportActionsProps {
  onPreview: () => void;
  onExport: () => void;
  isPreviewLoading: boolean;
  isExporting: boolean;
  error: string | null;
  draftState?: ReportDraftState | null;
  disabled?: boolean;
}

function DraftNotice({ draftState }: { draftState: ReportDraftState }) {
  if (!draftState.isDraft) {
    return (
      <div
        role="note"
        className="w-full rounded-card border border-primary-200 bg-primary-50 px-4 py-3 text-sm text-primary-900"
      >
        Báo cáo đủ điều kiện xuất ở trạng thái <strong>Hoàn tất tự khai</strong>
        .
      </div>
    );
  }
  return (
    <div
      role="note"
      className="w-full rounded-card border border-warning-600/40 bg-warning-50 px-4 py-3 text-sm"
    >
      <p className="font-medium">Báo cáo sẽ được đánh dấu “Bản nháp”</p>
      <p className="mt-1 text-muted">Lý do:</p>
      <ul className="mt-1 list-disc space-y-1 pl-5">
        {draftState.reasons.map((reason) => (
          <li key={reason}>{reason}</li>
        ))}
      </ul>
      <p className="mt-2 text-muted">
        Để báo cáo ở trạng thái “Hoàn tất tự khai”: điền đủ thông tin doanh
        nghiệp, trả lời đầy đủ các câu hỏi bắt buộc và chọn “Có” ở câu xác nhận
        của người có thẩm quyền.
      </p>
    </div>
  );
}

export function ReportActions({
  onPreview,
  onExport,
  isPreviewLoading,
  isExporting,
  error,
  draftState = null,
  disabled = false,
}: ReportActionsProps) {
  return (
    <div className="mt-6 flex flex-col gap-3 sm:items-end">
      {draftState ? <DraftNotice draftState={draftState} /> : null}
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
          {isExporting ? "Đang tạo báo cáo..." : "Tạo báo cáo"}
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
