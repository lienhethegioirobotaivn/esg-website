import { formatSavedAt } from "../lib/format-saved-at";

interface DraftRestoredNoticeProps {
  savedAt: string;
  onDismiss: () => void;
}

export function DraftRestoredNotice({
  savedAt,
  onDismiss,
}: DraftRestoredNoticeProps) {
  return (
    <div
      role="status"
      className="flex items-start justify-between gap-3 rounded-control border border-border-strong bg-surface-muted px-3 py-2 text-sm"
    >
      <p>
        Đã khôi phục bản nháp lưu lúc {formatSavedAt(savedAt)}. Tệp bằng chứng
        cần được tải lại.
      </p>
      <button
        type="button"
        onClick={onDismiss}
        className="shrink-0 text-primary-700 underline"
      >
        Đóng
      </button>
    </div>
  );
}
