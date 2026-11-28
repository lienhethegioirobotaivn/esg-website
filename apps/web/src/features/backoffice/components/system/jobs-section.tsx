"use client";

import type { JobView } from "@esg/shared";
import { Play, RefreshCw } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui";

import { errorMessage, sendJson } from "../../lib/api";
import { formatDateTime } from "../../lib/dates";
import { useResource } from "../../lib/use-resource";
import { Badge } from "../badge";
import { DataTable } from "../data-table";
import { LoadError, Loading } from "../states";
import { useNotify } from "../toast";

const JOB_LABELS: Readonly<Record<string, string>> = {
  "deliver-outbox": "Gửi thư đang chờ",
  "send-feedback-invites": "Gửi thư mời đánh giá",
  "cleanup-otp-challenges": "Dọn mã xác nhận hết hạn",
  "cleanup-sessions": "Dọn phiên đăng nhập hết hạn",
  "cleanup-rate-limits": "Dọn bộ đếm giới hạn tần suất",
  "cleanup-sent-emails": "Dọn thư đã gửi từ lâu",
  "cleanup-unattached-exports": "Dọn bản xuất và báo cáo bỏ dở",
  "cleanup-orphan-files": "Dọn tệp không còn dùng",
  "cleanup-stale-drafts": "Dọn bản nháp khảo sát cũ",
  "cleanup-post-images": "Dọn ảnh bài viết không dùng",
  "translate-content": "Dịch nội dung mới",
  "prune-translations": "Dọn bản dịch không dùng",
};

const RUN_STATUS = {
  running: { label: "Đang chạy", tone: "blue" },
  succeeded: { label: "Thành công", tone: "green" },
  failed: { label: "Lỗi", tone: "red" },
} as const;

const OUTCOME_MESSAGES = {
  ran: "đã chạy xong.",
  skipped: "đang chạy ở nơi khác nên được bỏ qua.",
  failed: "chạy bị lỗi. Xem nhật ký API để biết nguyên nhân.",
} as const;

function jobLabel(name: string): string {
  return JOB_LABELS[name] ?? name;
}

function interval(seconds: number): string {
  if (seconds >= 86_400) {
    return `${Math.round(seconds / 86_400)} ngày`;
  }
  if (seconds >= 3600) {
    return `${Math.round(seconds / 3600)} giờ`;
  }
  if (seconds >= 60) {
    return `${Math.round(seconds / 60)} phút`;
  }
  return `${seconds} giây`;
}

export function JobsSection() {
  const notify = useNotify();
  const resource = useResource<{ jobs: JobView[] }>("/admin/jobs");
  const [running, setRunning] = useState<string | null>(null);

  async function run(name: string) {
    setRunning(name);
    try {
      const { outcome } = await sendJson<{
        outcome: keyof typeof OUTCOME_MESSAGES;
      }>("POST", `/admin/jobs/${name}/run`);
      notify(
        `“${jobLabel(name)}” ${OUTCOME_MESSAGES[outcome]}`,
        outcome === "failed" ? "error" : "success",
      );
    } catch (caught) {
      notify(errorMessage(caught, "Không chạy được công việc."), "error");
    } finally {
      setRunning(null);
      resource.reload();
    }
  }

  return (
    <section className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base">Việc nền</h2>
        <Button
          variant="ghost"
          size="sm"
          leadingIcon={<RefreshCw aria-hidden className="size-4" />}
          onClick={resource.reload}
        >
          Tải lại
        </Button>
      </div>
      {resource.error ? (
        <LoadError error={resource.error} onRetry={resource.reload} />
      ) : null}
      {resource.data ? (
        <DataTable
          label="Danh sách việc nền"
          rows={resource.data.jobs}
          rowKey={(job) => job.name}
          busy={resource.loading}
          empty="Không có việc nền nào."
          columns={[
            { header: "Công việc", cell: (job) => jobLabel(job.name) },
            { header: "Chu kỳ", cell: (job) => interval(job.intervalSeconds) },
            {
              header: "Lần chạy gần nhất",
              cell: (job) => {
                if (!job.tracked) {
                  return <span className="text-subtle">Không ghi lịch sử</span>;
                }
                return job.lastRun ? (
                  formatDateTime(job.lastRun.startedAt)
                ) : (
                  <span className="text-subtle">Chưa chạy</span>
                );
              },
            },
            {
              header: "Kết quả",
              className: "max-w-100",
              cell: (job) =>
                job.lastRun ? (
                  <div className="space-y-1">
                    <Badge tone={RUN_STATUS[job.lastRun.status].tone}>
                      {RUN_STATUS[job.lastRun.status].label}
                    </Badge>
                    {job.lastRun.detail ? (
                      <details className="text-xs text-muted">
                        <summary className="cursor-pointer">Chi tiết</summary>
                        <pre className="mt-1 whitespace-pre-wrap break-all">
                          {JSON.stringify(job.lastRun.detail, null, 2)}
                        </pre>
                      </details>
                    ) : null}
                  </div>
                ) : null,
            },
            {
              header: <span className="sr-only">Thao tác</span>,
              className: "text-right",
              cell: (job) => (
                <Button
                  variant="secondary"
                  size="sm"
                  loading={running === job.name}
                  disabled={running !== null}
                  leadingIcon={<Play aria-hidden className="size-3.5" />}
                  onClick={() => void run(job.name)}
                >
                  Chạy ngay
                </Button>
              ),
            },
          ]}
        />
      ) : resource.loading ? (
        <Loading />
      ) : null}
    </section>
  );
}
