"use client";

import type { OutboxItem, OutboxList } from "@esg/shared";
import { useState } from "react";

import { Button } from "@/components/ui";
import { cn } from "@/lib/cn";

import { errorMessage, sendJson, withQuery } from "../../lib/api";
import { formatDateTime } from "../../lib/dates";
import { PAGE_SIZE } from "../../lib/use-query-state";
import { useResource } from "../../lib/use-resource";
import { ConfirmDialog } from "../confirm-dialog";
import { DataTable, Pagination } from "../data-table";
import { LoadError, Loading } from "../states";
import { useNotify } from "../toast";

const STATUSES = [
  { value: "failed", label: "Gửi lỗi" },
  { value: "pending", label: "Đang chờ" },
  { value: "sent", label: "Đã gửi" },
] as const;

type MailStatus = (typeof STATUSES)[number]["value"];

const TEMPLATE_LABELS: Readonly<Record<string, string>> = {
  otp: "Mã xác nhận email",
  inquiry_notice: "Báo yêu cầu mới",
  feedback_invite: "Mời đánh giá",
};

export function OutboxSection() {
  const notify = useNotify();
  const [status, setStatus] = useState<MailStatus>("failed");
  const [page, setPage] = useState(1);
  const [removing, setRemoving] = useState<OutboxItem | null>(null);
  const [retrying, setRetrying] = useState<string | null>(null);
  const resource = useResource<OutboxList>(
    withQuery("/admin/outbox", {
      status,
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
    }),
  );

  async function retry(item: OutboxItem) {
    setRetrying(item.id);
    try {
      await sendJson("POST", `/admin/outbox/${item.id}/retry`);
      notify("Đã đưa thư vào hàng chờ gửi lại.");
    } catch (caught) {
      notify(errorMessage(caught, "Không gửi lại được thư."), "error");
    } finally {
      setRetrying(null);
      resource.reload();
    }
  }

  async function remove(item: OutboxItem) {
    await sendJson("DELETE", `/admin/outbox/${item.id}`);
    setRemoving(null);
    notify("Đã xóa thư lỗi.");
    resource.reload();
  }

  return (
    <section className="space-y-2">
      <h2 className="text-base">Thư gửi đi</h2>
      <div className="flex flex-wrap gap-1" role="group" aria-label="Lọc thư">
        {STATUSES.map((item) => (
          <Button
            key={item.value}
            variant="secondary"
            size="sm"
            aria-pressed={status === item.value}
            className={cn(
              status === item.value &&
                "border-primary-700 bg-primary-100 text-primary-900",
            )}
            onClick={() => {
              setStatus(item.value);
              setPage(1);
            }}
          >
            {item.label}
            {resource.data ? ` (${resource.data.counts[item.value]})` : ""}
          </Button>
        ))}
      </div>
      {resource.error ? (
        <LoadError error={resource.error} onRetry={resource.reload} />
      ) : null}
      {resource.data ? (
        <>
          <DataTable
            label="Danh sách thư"
            rows={resource.data.items}
            rowKey={(item) => item.id}
            busy={resource.loading}
            empty="Không có thư nào."
            columns={[
              { header: "Người nhận", cell: (item) => item.toEmail },
              {
                header: "Loại thư",
                cell: (item) =>
                  TEMPLATE_LABELS[item.template] ?? item.template,
              },
              {
                header: "Thời điểm",
                cell: (item) =>
                  formatDateTime(item.sentAt ?? item.createdAt),
              },
              { header: "Số lần thử", cell: (item) => item.attempts },
              {
                header: "Lỗi",
                className: "max-w-80",
                cell: (item) => <p className="break-words">{item.error}</p>,
              },
              {
                header: <span className="sr-only">Thao tác</span>,
                cell: (item) =>
                  item.status === "failed" ? (
                    <div className="flex justify-end gap-1.5">
                      {item.canRetry ? (
                        <Button
                          variant="secondary"
                          size="sm"
                          loading={retrying === item.id}
                          disabled={retrying !== null}
                          onClick={() => void retry(item)}
                        >
                          Gửi lại
                        </Button>
                      ) : null}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setRemoving(item)}
                      >
                        Xóa
                      </Button>
                    </div>
                  ) : null,
              },
            ]}
          />
          <Pagination page={page} total={resource.data.total} onChange={setPage} />
        </>
      ) : resource.loading ? (
        <Loading rows={3} />
      ) : null}
      {removing ? (
        <ConfirmDialog
          title="Xóa thư lỗi"
          confirmLabel="Xóa thư"
          busyLabel="Đang xóa..."
          onConfirm={() => remove(removing)}
          onCancel={() => setRemoving(null)}
        >
          <p>
            Thư gửi tới {removing.toEmail} sẽ bị xóa và không được gửi nữa.
          </p>
        </ConfirmDialog>
      ) : null}
    </section>
  );
}
