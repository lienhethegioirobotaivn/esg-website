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
      className="flex items-start justify-between gap-3 rounded-control border border-primary-200 bg-primary-50 px-4 py-3 text-sm text-primary-900"
    >
      <p>
        Đã khôi phục bản nháp lưu lúc {formatSavedAt(savedAt)}. Tệp bằng chứng
        cần được tải lại.
      </p>
      <button
        type="button"
        onClick={onDismiss}
        className="shrink-0 font-medium text-primary-700 hover:underline"
      >
        Đóng
      </button>
    </div>
  );
}
