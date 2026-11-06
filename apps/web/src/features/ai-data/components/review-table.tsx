import { cn } from "@/lib/cn";

import type { ReviewRow } from "../types";

interface ReviewTableProps {
  rows: readonly ReviewRow[];
  tone?: "ai" | "default";
}

export function ReviewTable({ rows, tone = "ai" }: ReviewTableProps) {
  if (rows.length === 0) {
    return <p className="px-4 py-3 text-sm text-muted">Chưa có dữ liệu.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-3xl border-collapse text-left text-[0.8125rem]">
        <thead>
          <tr className="border-b border-border bg-surface-muted text-xs text-muted">
            <th className="px-3 py-2 font-medium">Nội dung</th>
            <th className="px-3 py-2 font-medium">Giá trị đã điền</th>
            <th className="px-3 py-2 font-medium">Trích nguyên văn</th>
            <th className="px-3 py-2 font-medium">Trang</th>
            <th className="px-3 py-2 font-medium">Kiểm tra</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key} className={cn("border-b border-border align-top", tone === "ai" ? "bg-yellow-100" : "bg-surface-muted")}>
              <td className="px-3 py-2">
                <span className="mr-1.5 text-xs text-subtle">{row.key}</span>
                {row.label}
              </td>
              <td className="px-3 py-2 font-medium">{row.shown}</td>
              <td className="px-3 py-2 text-muted">{row.quote}</td>
              <td className="px-3 py-2">{row.page}</td>
              <td
                className={cn(
                  "px-3 py-2 text-xs",
                  row.checked === "fail" ? "font-medium text-danger-600" : "text-muted",
                )}
              >
                {row.flags.join("; ")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
