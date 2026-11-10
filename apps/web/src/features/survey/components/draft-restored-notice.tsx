import { useLocale, useT } from "@/features/locale";

import { formatSavedAt } from "../lib/format-saved-at";

interface DraftRestoredNoticeProps {
  savedAt: string;
  onDismiss: () => void;
}

export function DraftRestoredNotice({
  savedAt,
  onDismiss,
}: DraftRestoredNoticeProps) {
  const t = useT();
  const locale = useLocale();
  return (
    <div
      role="status"
      className="flex items-start justify-between gap-3 rounded-control border border-border-strong bg-surface-muted px-3 py-2 text-sm"
    >
      <p>
        {t(
          "Đã khôi phục bản nháp lưu lúc {time}. Tệp bằng chứng cần được tải lại.",
          { time: formatSavedAt(savedAt, locale) },
        )}
      </p>
      <button
        type="button"
        onClick={onDismiss}
        className="shrink-0 text-primary-700 underline"
      >
        {t("Đóng")}
      </button>
    </div>
  );
}
