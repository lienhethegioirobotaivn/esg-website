"use client";

import { Card } from "@/components/ui";

import { withQuery } from "../../lib/api";
import { formatDateTime } from "../../lib/dates";
import { FEEDBACK_KIND_LABELS, toOptions } from "../../lib/labels";
import type { Feedback, FeedbackList } from "../../lib/types";
import { PAGE_SIZE, useQueryState } from "../../lib/use-query-state";
import { useResource } from "../../lib/use-resource";
import { Badge } from "../badge";
import { DataTable, Pagination, type Column } from "../data-table";
import { ExportButtons } from "../export-buttons";
import { FilterBar, FilterSelect } from "../filters";
import { PageHeader } from "../page-header";
import { LoadError, Loading } from "../states";

const columns: Column<Feedback>[] = [
  {
    header: "Mã, thời điểm",
    cell: (row) => (
      <>
        <div className="font-semibold">{row.code}</div>
        <div className="text-xs text-muted">
          {formatDateTime(row.submittedAt ?? row.createdAt)}
        </div>
      </>
    ),
  },
  { header: "Nguồn", cell: (row) => FEEDBACK_KIND_LABELS[row.kind] },
  {
    header: "Điểm",
    cell: (row) =>
      row.rating === null ? (
        <Badge>Chưa trả lời</Badge>
      ) : (
        <Badge tone={row.rating >= 4 ? "green" : row.rating === 3 ? "amber" : "red"}>
          {row.rating}/5
        </Badge>
      ),
  },
  {
    header: "Nhận xét",
    className: "max-w-120",
    cell: (row) => (
      <p className="whitespace-pre-line break-words">{row.comment}</p>
    ),
  },
  { header: "Email", cell: (row) => row.email },
  { header: "Báo cáo", cell: (row) => row.reportCode },
];

function Figure({ value, label }: { value: string; label: string }) {
  return (
    <Card className="min-w-40 flex-1 p-4">
      <p className="text-2xl font-bold tabular-nums text-primary-800">{value}</p>
      <p className="text-sm text-muted">{label}</p>
    </Card>
  );
}

export function FeedbackPage() {
  const query = useQueryState();
  const kind = query.get("kind");
  const list = useResource<FeedbackList>(
    withQuery("/admin/feedback", {
      kind,
      limit: PAGE_SIZE,
      offset: query.offset,
    }),
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title="Phản hồi"
        description="Đánh giá gửi trực tiếp trên website và qua thư mời sau khi xuất báo cáo."
        actions={
          <ExportButtons
            path="/admin/feedback/export"
            baseName="phan-hoi"
            params={{ kind }}
          />
        }
      />
      <FilterBar active={query.active} onClear={query.clear}>
        <FilterSelect
          label="Nguồn"
          className="max-w-64"
          value={kind}
          options={toOptions(FEEDBACK_KIND_LABELS)}
          onChange={(value) => query.set({ kind: value })}
        />
      </FilterBar>
      {list.error ? (
        <LoadError error={list.error} onRetry={list.reload} />
      ) : null}
      {list.data ? (
        <>
          <div className="flex flex-wrap gap-3">
            <Figure
              value={
                list.data.averageRating === null
                  ? "—"
                  : `${list.data.averageRating.toLocaleString("vi-VN")}/5`
              }
              label="Điểm trung bình"
            />
            <Figure value={String(list.data.answered)} label="Đã trả lời" />
            <Figure
              value={String(list.data.total)}
              label="Tổng số, gồm cả thư mời chưa trả lời"
            />
          </div>
          <DataTable
            label="Danh sách phản hồi"
            columns={columns}
            rows={list.data.items}
            rowKey={(row) => row.id}
            busy={list.loading}
            minWidth="min-w-220"
            empty="Chưa có phản hồi nào."
          />
          <Pagination
            page={query.page}
            total={list.data.total}
            onChange={(page) => query.set({ page: String(page) })}
          />
        </>
      ) : list.loading ? (
        <Loading />
      ) : null}
    </div>
  );
}
