import type { ReactNode } from "react";

import { Button } from "@/components/ui";
import { cn } from "@/lib/cn";

import { PAGE_SIZE } from "../lib/use-query-state";

export interface Column<T> {
  header: ReactNode;
  cell: (row: T) => ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  label: string;
  columns: readonly Column<T>[];
  rows: readonly T[];
  rowKey: (row: T) => string;
  empty: ReactNode;
  busy?: boolean;
  minWidth?: string;
}

export function DataTable<T>({
  label,
  columns,
  rows,
  rowKey,
  empty,
  busy = false,
  minWidth = "min-w-180",
}: DataTableProps<T>) {
  return (
    <div
      aria-busy={busy}
      className={cn(
        "relative overflow-x-auto rounded-card border border-border bg-surface transition-opacity",
        busy && "opacity-60",
      )}
    >
      <table
        aria-label={label}
        className={cn("w-full text-left text-sm", minWidth)}
      >
        <thead className="border-b border-border bg-surface-muted text-xs text-muted">
          <tr>
            {columns.map((column, index) => (
              <th
                key={index}
                className={cn("px-3 py-2.5 font-semibold", column.className)}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-3 py-10 text-center text-muted"
              >
                {empty}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={rowKey(row)} className="align-top hover:bg-primary-50">
                {columns.map((column, index) => (
                  <td key={index} className={cn("px-3 py-3", column.className)}>
                    {column.cell(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export function Pagination({
  page,
  total,
  pageSize = PAGE_SIZE,
  onChange,
}: {
  page: number;
  total: number;
  pageSize?: number;
  onChange: (page: number) => void;
}) {
  if (total === 0) {
    return null;
  }
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const first = Math.min((page - 1) * pageSize + 1, total);
  const last = Math.min(page * pageSize, total);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted">
      <span>
        {page > pages
          ? `Không có dòng nào ở trang ${page}`
          : `Dòng ${first}–${last} trong ${total}`}
      </span>
      <div className="flex gap-2">
        <Button
          variant="secondary"
          size="sm"
          disabled={page <= 1}
          onClick={() => onChange(Math.min(page - 1, pages))}
        >
          Trang trước
        </Button>
        <Button
          variant="secondary"
          size="sm"
          disabled={page >= pages}
          onClick={() => onChange(page + 1)}
        >
          Trang sau
        </Button>
      </div>
    </div>
  );
}
