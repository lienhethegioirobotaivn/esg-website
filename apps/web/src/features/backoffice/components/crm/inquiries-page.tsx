"use client";

import Link from "next/link";

import { withQuery } from "../../lib/api";
import { formatDateTime, isPast } from "../../lib/dates";
import {
  INQUIRY_KIND_LABELS,
  INQUIRY_STATUS_LABELS,
  INQUIRY_STATUS_TONES,
  PRIORITY_LABELS,
  PRIORITY_TONES,
  toOptions,
} from "../../lib/labels";
import type { Inquiry, Paged } from "../../lib/types";
import { PAGE_SIZE, useQueryState } from "../../lib/use-query-state";
import { useResource } from "../../lib/use-resource";
import { useAssignees } from "../assignees";
import { Badge } from "../badge";
import { DataTable, Pagination, type Column } from "../data-table";
import { ExportButtons } from "../export-buttons";
import { FilterBar, FilterSelect, SearchBox } from "../filters";
import { PageHeader } from "../page-header";
import { LoadError, Loading } from "../states";

const CLOSED_STATUSES: readonly string[] = ["done", "declined", "invalid"];

export function InquiriesPage() {
  const query = useQueryState();
  const assignees = useAssignees();
  const filters = {
    q: query.get("q"),
    kind: query.get("kind"),
    status: query.get("status"),
    assignedAdminId: query.get("assignee"),
  };
  const list = useResource<Paged<Inquiry>>(
    withQuery("/admin/inquiries", {
      ...filters,
      limit: PAGE_SIZE,
      offset: query.offset,
    }),
  );

  const columns: Column<Inquiry>[] = [
    {
      header: "Mã, ngày gửi",
      cell: (row) => (
        <>
          <Link
            href={`/quan-tri/yeu-cau/${row.id}`}
            className="font-semibold text-primary-700 hover:underline"
          >
            {row.code}
          </Link>
          <div className="text-xs text-muted">
            {formatDateTime(row.createdAt)}
          </div>
        </>
      ),
    },
    {
      header: "Doanh nghiệp",
      cell: (row) => (
        <>
          <div>{row.companyName}</div>
          <div className="text-xs text-muted">
            {row.contactEmail ?? row.contactPhone}
          </div>
        </>
      ),
    },
    {
      header: "Loại",
      cell: (row) => (
        <Badge tone={row.kind === "consulting" ? "blue" : "gray"}>
          {INQUIRY_KIND_LABELS[row.kind]}
        </Badge>
      ),
    },
    {
      header: "Trạng thái",
      cell: (row) => (
        <Badge tone={INQUIRY_STATUS_TONES[row.status]}>
          {INQUIRY_STATUS_LABELS[row.status]}
        </Badge>
      ),
    },
    {
      header: "Ưu tiên",
      cell: (row) => (
        <Badge tone={PRIORITY_TONES[row.priority]}>
          {PRIORITY_LABELS[row.priority]}
        </Badge>
      ),
    },
    {
      header: "Phụ trách",
      cell: (row) => assignees.name(row.assignedAdminId),
    },
    {
      header: "Hẹn gọi lại",
      cell: (row) => {
        if (row.followUpAt === null) {
          return <span className="text-subtle">Chưa hẹn</span>;
        }
        const overdue =
          isPast(row.followUpAt) && !CLOSED_STATUSES.includes(row.status);
        return (
          <>
            <div>{formatDateTime(row.followUpAt)}</div>
            {overdue ? <Badge tone="red">Quá hẹn</Badge> : null}
          </>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Yêu cầu tư vấn và kiểm định"
        description="Tiếp nhận từ website, theo dõi đến khi hoàn tất."
        actions={
          <ExportButtons
            path="/admin/inquiries/export"
            baseName="yeu-cau"
            params={filters}
          />
        }
      />
      <FilterBar active={query.active} onClear={query.clear}>
        <SearchBox
          value={filters.q}
          placeholder="Mã, tên doanh nghiệp, email, điện thoại"
          onChange={(q) => query.set({ q })}
        />
        <FilterSelect
          label="Loại"
          value={filters.kind}
          options={toOptions(INQUIRY_KIND_LABELS)}
          onChange={(kind) => query.set({ kind })}
        />
        <FilterSelect
          label="Trạng thái"
          value={filters.status}
          options={toOptions(INQUIRY_STATUS_LABELS)}
          onChange={(status) => query.set({ status })}
        />
        <FilterSelect
          label="Người phụ trách"
          value={filters.assignedAdminId}
          options={assignees.options}
          onChange={(assignee) => query.set({ assignee })}
        />
      </FilterBar>
      {list.error ? (
        <LoadError error={list.error} onRetry={list.reload} />
      ) : null}
      {list.data ? (
        <>
          <DataTable
            label="Danh sách yêu cầu"
            columns={columns}
            rows={list.data.items}
            rowKey={(row) => row.id}
            busy={list.loading}
            minWidth="min-w-220"
            empty={
              query.active
                ? "Không có yêu cầu nào khớp bộ lọc."
                : "Chưa có yêu cầu nào."
            }
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
