import type { BankIssue } from "@esg/shared";

import { Badge } from "@/features/backoffice/components/badge";

export function IssueList({
  issues,
  onSelect,
}: {
  issues: readonly BankIssue[];
  onSelect?: (code: string) => void;
}) {
  const sorted = [...issues].sort(
    (a, b) =>
      Number(a.severity === "warning") - Number(b.severity === "warning"),
  );
  return (
    <ul className="max-h-64 divide-y divide-border overflow-y-auto rounded-card border border-border text-sm">
      {sorted.map((issue, index) => (
        <li key={index} className="flex items-start gap-2 p-2.5">
          <Badge tone={issue.severity === "error" ? "red" : "amber"}>
            {issue.severity === "error" ? "Lỗi" : "Lưu ý"}
          </Badge>
          <div className="min-w-0 flex-1">
            {issue.code && onSelect ? (
              <button
                type="button"
                className="mr-1.5 font-semibold text-primary-700 underline"
                onClick={() => onSelect(issue.code ?? "")}
              >
                {issue.code}
              </button>
            ) : issue.code ? (
              <span className="mr-1.5 font-semibold">{issue.code}</span>
            ) : null}
            <span className="break-words">{issue.message}</span>
            {issue.tab || issue.row !== null ? (
              <span className="block text-xs text-muted">
                {[
                  issue.tab ? `Tab ${issue.tab}` : "",
                  issue.row === null ? "" : `dòng ${issue.row}`,
                ]
                  .filter(Boolean)
                  .join(", ")}
              </span>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}
