import { Eye, FileDown } from "lucide-react";

import { Button } from "@/components/ui";
import { useT } from "@/features/locale";

import type {
  DraftJumpTarget,
  ReportDraftState,
} from "../lib/report-draft-state";

interface ReportActionsProps {
  onPreview: () => void;
  onExport: () => void;
  isPreviewLoading: boolean;
  isExporting: boolean;
  error: string | null;
  draftState?: ReportDraftState | null;
  onJump?: (target: DraftJumpTarget) => void;
  disabled?: boolean;
}

function DraftNotice({
  draftState,
  onJump,
}: {
  draftState: ReportDraftState;
  onJump?: (target: DraftJumpTarget) => void;
}) {
  const t = useT();
  if (!draftState.isDraft) {
    return (
      <div
        role="note"
        className="w-full rounded-card border border-primary-200 bg-primary-50 px-4 py-3 text-sm text-primary-900"
      >
        {t("Báo cáo đủ điều kiện xuất ở trạng thái “Hoàn tất tự khai”.")}
      </div>
    );
  }
  return (
    <div
      role="note"
      className="w-full rounded-card border border-warning-600/40 bg-warning-50 px-4 py-3 text-sm"
    >
      <p className="font-medium">
        {t("Báo cáo sẽ được đánh dấu “Bản nháp”")}
      </p>
      <p className="mt-1 text-muted">{t("Lý do:")}</p>
      <ul className="mt-1 list-disc space-y-1 pl-5">
        {draftState.reasons.map((reason) => (
          <li key={reason.text}>
            {reason.text}{" "}
            {onJump ? (
              <button
                type="button"
                onClick={() => onJump(reason.target)}
                className="font-medium text-primary-700 underline underline-offset-2 hover:text-primary-900"
              >
                {t("Đi tới đây")}
              </button>
            ) : null}
          </li>
        ))}
      </ul>
      <p className="mt-2 text-muted">
        {t(
          "Để báo cáo ở trạng thái “Hoàn tất tự khai”: điền đủ thông tin doanh nghiệp, trả lời đầy đủ các câu hỏi bắt buộc và chọn “Có” ở câu xác nhận của người có thẩm quyền.",
        )}
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
  onJump,
  disabled = false,
}: ReportActionsProps) {
  const t = useT();
  return (
    <div className="mt-6 flex flex-col gap-3 sm:items-end">
      {draftState ? (
        <DraftNotice draftState={draftState} onJump={onJump} />
      ) : null}
      <div className="flex gap-2">
        <Button
          variant="secondary"
          className="flex-1 sm:flex-none"
          onClick={onPreview}
          disabled={disabled || isPreviewLoading}
          leadingIcon={<Eye aria-hidden className="size-4" />}
        >
          {isPreviewLoading
            ? t("Đang tạo bản xem trước...")
            : t("Xem bản nháp")}
        </Button>
        <Button
          className="flex-1 sm:flex-none"
          onClick={onExport}
          disabled={disabled || isExporting}
          leadingIcon={<FileDown aria-hidden className="size-4" />}
        >
          {isExporting ? t("Đang tạo báo cáo...") : t("Tạo báo cáo")}
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
