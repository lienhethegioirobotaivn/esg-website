"use client";

import { Eraser, Languages } from "lucide-react";
import { useState } from "react";

import { Button, Card } from "@/components/ui";
import { ConfirmDialog } from "@/features/backoffice/components/confirm-dialog";
import { useNotify } from "@/features/backoffice/components/toast";
import { errorMessage, sendJson } from "@/features/backoffice/lib/api";

import {
  TRANSLATION_LOCALE_LABELS,
  type TranslationLocale,
  type TranslationPruneResult,
  type TranslationRunResult,
} from "../lib/translations";

const MAX_ROUNDS = 25;

const STOP_MESSAGES = {
  daily_limit:
    "Đã hết hạn mức gọi dịch trong ngày. Việc nền sẽ dịch tiếp vào hôm sau.",
  rate_limited: "Dịch vụ dịch đang giới hạn tốc độ. Hãy thử lại sau ít phút.",
  error: "Dịch vụ dịch trả lỗi. Hãy thử lại sau.",
} as const;

export function TranslationActions({
  configured,
  onChanged,
}: {
  configured: boolean;
  onChanged: () => void;
}) {
  const notify = useNotify();
  const [running, setRunning] = useState<"missing" | "failed" | null>(null);
  const [lines, setLines] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pruning, setPruning] = useState(false);

  async function run(mode: "missing" | "failed") {
    setRunning(mode);
    setError(null);
    setLines([]);
    try {
      let previous = Number.POSITIVE_INFINITY;
      for (let round = 0; round < MAX_ROUNDS; round += 1) {
        const result = await sendJson<TranslationRunResult>(
          "POST",
          "/admin/translations/run",
          { retryFailed: mode === "failed" && round === 0 },
        );
        const entries = Object.entries(result.locales) as [
          TranslationLocale,
          NonNullable<TranslationRunResult["locales"][TranslationLocale]>,
        ][];
        setLines(
          entries.map(
            ([locale, progress]) =>
              `${TRANSLATION_LOCALE_LABELS[locale]}: ${progress.total - progress.remaining}/${progress.total} đoạn đã dịch`,
          ),
        );
        const remaining = entries.reduce(
          (sum, [, progress]) => sum + progress.remaining,
          0,
        );
        if (!result.configured) {
          setError("Máy chủ chưa có khóa dịch.");
          break;
        }
        if (remaining === 0) {
          notify("Đã dịch xong toàn bộ nội dung.");
          break;
        }
        if (
          result.stoppedReason !== null &&
          result.stoppedReason !== "time_budget"
        ) {
          setError(STOP_MESSAGES[result.stoppedReason]);
          break;
        }
        if (remaining >= previous) {
          setError(
            `Còn ${remaining} đoạn chưa dịch được. Bạn có thể bấm "Thử lại đoạn bị lỗi" hoặc sửa tay.`,
          );
          break;
        }
        previous = remaining;
      }
    } catch (caught) {
      setError(errorMessage(caught, "Không dịch được nội dung."));
    } finally {
      setRunning(null);
      onChanged();
    }
  }

  async function prune() {
    const result = await sendJson<TranslationPruneResult>(
      "POST",
      "/admin/translations/run",
      { prune: true },
    );
    setPruning(false);
    notify(
      result.skipped
        ? "Không dọn được vì chưa đọc được nội dung hiện có."
        : `Đã xóa ${result.removed} dòng không còn dùng, giữ ${result.keptManual} dòng sửa tay.`,
      result.skipped ? "error" : "success",
    );
    onChanged();
  }

  return (
    <Card className="space-y-3 p-4">
      <div className="flex flex-wrap gap-2">
        <Button
          loading={running === "missing"}
          disabled={!configured || running !== null}
          leadingIcon={<Languages aria-hidden className="size-4" />}
          onClick={() => void run("missing")}
        >
          Dịch phần còn thiếu
        </Button>
        <Button
          variant="secondary"
          loading={running === "failed"}
          disabled={!configured || running !== null}
          onClick={() => void run("failed")}
        >
          Thử lại đoạn bị lỗi
        </Button>
        <Button
          variant="ghost"
          disabled={running !== null}
          leadingIcon={<Eraser aria-hidden className="size-4" />}
          onClick={() => setPruning(true)}
        >
          Dọn bản dịch không còn dùng
        </Button>
      </div>
      {running !== null ? (
        <p className="text-sm text-muted">
          Đang dịch, có thể mất vài phút. Hãy giữ trang này mở.
        </p>
      ) : null}
      {lines.length > 0 ? (
        <ul aria-live="polite" className="space-y-0.5 text-sm">
          {lines.map((line) => (
            <li key={line} className="first-letter:uppercase">
              {line}
            </li>
          ))}
        </ul>
      ) : null}
      {error ? (
        <p role="alert" className="text-sm text-danger-600">
          {error}
        </p>
      ) : null}
      {pruning ? (
        <ConfirmDialog
          title="Dọn bản dịch không còn dùng"
          confirmLabel="Dọn ngay"
          busyLabel="Đang dọn..."
          tone="primary"
          onConfirm={prune}
          onCancel={() => setPruning(false)}
        >
          <p>
            Xóa bản dịch máy của những đoạn chữ không còn xuất hiện trên
            website. Bản sửa tay luôn được giữ lại.
          </p>
        </ConfirmDialog>
      ) : null}
    </Card>
  );
}
