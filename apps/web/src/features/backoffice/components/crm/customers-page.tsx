"use client";

import Link from "next/link";

import { withQuery } from "../../lib/api";
import { formatDateTime, isPast } from "../../lib/dates";
import {
  CARE_STATUS_LABELS,
  CARE_STATUS_TONES,
  headcountLabel,
  sectorLabel,
  toOptions,
} from "../../lib/labels";
import type { Customer, Paged } from "../../lib/types";
import { PAGE_SIZE, useQueryState } from "../../lib/use-query-state";
import { useResource } from "../../lib/use-resource";
import { useAssignees } from "../assignees";
import { Badge } from "../badge";
import { DataTable, Pagination, type Column } from "../data-table";
import { ExportButtons } from "../export-buttons";
import { FilterBar, FilterSelect, SearchBox } from "../filters";
import { PageHeader } from "../page-header";
import { LoadError, Loading } from "../states";

export function CustomersPage() {
  const query = useQueryState();
  const assignees = useAssignees();
  const filters = {
    q: query.get("q"),
    careStatus: query.get("careStatus"),
    assignedAdminId: query.get("assignee"),
  };
  const list = useResource<Paged<Customer>>(
    withQuery("/admin/customers", {
      ...filters,
      limit: PAGE_SIZE,
      offset: query.offset,
    }),
  );

  const columns: Column<Customer>[] = [
    {
      header: "Doanh nghiệp",
      cell: (row) => (
        <>
          <Link
            href={`/quan-tri/doanh-nghiep/${row.id}`}
            className="font-semibold text-primary-700 hover:underline"
          >
            {row.legalName}
          </Link>
          <div className="text-xs text-muted">
            {[row.taxCode, sectorLabel(row.primarySector), headcountLabel(row.headcountTier)]
              .filter(Boolean)
              .join(" · ")}
          </div>
        </>
      ),
    },
    {
      header: "Người liên hệ",
      cell: (row) => (
        <>
          <div>{row.contactName}</div>
          <div className="text-xs text-muted">
            {[row.contactEmail, row.contactPhone].filter(Boolean).join(" · ")}
          </div>
        </>
      ),
    },
    {
      header: "Báo cáo",
      cell: (row) => <span className="tabular-nums">{row.reportCount}</span>,
    },
    {
      header: "Đồng ý tư vấn",
      cell: (row) =>
        row.advisoryConsent === null ? (
          <span className="text-subtle">Chưa hỏi</span>
        ) : (
          <Badge tone={row.advisoryConsent ? "green" : "gray"}>
            {row.advisoryConsent ? "Có" : "Không"}
          </Badge>
        ),
    },
    {
      header: "Chăm sóc",
      cell: (row) => (
        <Badge tone={CARE_STATUS_TONES[row.careStatus]}>
          {CARE_STATUS_LABELS[row.careStatus]}
        </Badge>
      ),
    },
    {
      header: "Phụ trách",
      cell: (row) => assignees.name(row.assignedAdminId),
    },
    {
      header: "Liên hệ tiếp",
      cell: (row) => {
        if (row.nextContactAt === null) {
          return <span className="text-subtle">Chưa hẹn</span>;
        }
        return (
          <>
            <div>{formatDateTime(row.nextContactAt)}</div>
            {isPast(row.nextContactAt) && row.careStatus !== "closed" ? (
              <Badge tone="red">Quá hẹn</Badge>
            ) : null}
          </>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Doanh nghiệp"
        description="Doanh nghiệp đã dùng khảo sát hoặc để lại thông tin."
        actions={
          <ExportButtons
            path="/admin/customers/export"
            baseName="khach-hang"
            params={filters}
          />
        }
      />
      <FilterBar active={query.active} onClear={query.clear}>
        <SearchBox
          value={filters.q}
          placeholder="Tên, mã số thuế, email, điện thoại"
          onChange={(q) => query.set({ q })}
        />
        <FilterSelect
          label="Trạng thái chăm sóc"
          value={filters.careStatus}
          options={toOptions(CARE_STATUS_LABELS)}
          onChange={(careStatus) => query.set({ careStatus })}
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
            label="Danh sách doanh nghiệp"
            columns={columns}
            rows={list.data.items}
            rowKey={(row) => row.id}
            busy={list.loading}
            minWidth="min-w-240"
            empty={
              query.active
                ? "Không có doanh nghiệp nào khớp bộ lọc."
                : "Chưa có doanh nghiệp nào."
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
