import { formatSavedAt } from "../lib/format-saved-at";

interface ProgressSummaryProps {
  completed: number;
  total: number;
  savedAt: string | null;
  isDirty: boolean;
  saveFailed: boolean;
}

function getStatus({
  savedAt,
  isDirty,
  saveFailed,
}: Pick<ProgressSummaryProps, "savedAt" | "isDirty" | "saveFailed">): string {
  if (saveFailed) {
    return "Không lưu được";
  }
  if (isDirty) {
    return "Chưa lưu";
  }
  if (savedAt !== null) {
    return `Đã lưu lúc ${formatSavedAt(savedAt)}`;
  }
  return "Chưa có bản nháp";
}

export function ProgressSummary(props: ProgressSummaryProps) {
  const { completed, total, saveFailed } = props;
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
  return (
    <div className="w-full shrink-0 md:w-72">
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <p
          role="status"
          className={saveFailed ? "font-medium text-danger-600" : "text-muted"}
        >
          Hồ sơ đang soạn · {getStatus(props)}
        </p>
        <p className="shrink-0 text-muted">
          <span className="font-semibold text-foreground">{completed}</span> /{" "}
          {total} câu
        </p>
      </div>
      <div
        role="progressbar"
        aria-label="Tiến độ hoàn thành"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={completed}
        className="mt-2 h-2 w-full overflow-hidden bg-surface-muted"
      >
        <div
          className="h-full bg-primary-600"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
