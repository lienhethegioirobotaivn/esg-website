import type { ReactNode } from "react";

import { Button, Card, LoadingRegion, Skeleton } from "@/components/ui";

import type { ApiError } from "../lib/api";

export function LoadError({
  error,
  onRetry,
}: {
  error: ApiError;
  onRetry: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-[#f0c3bd] bg-danger-50 p-4 text-sm"
    >
      <span>{error.message}</span>
      <Button variant="secondary" size="sm" onClick={onRetry}>
        Thử lại
      </Button>
    </div>
  );
}

export function Loading({ rows = 5 }: { rows?: number }) {
  return (
    <LoadingRegion label="Đang tải dữ liệu...">
      <Card className="space-y-4 p-4">
        {Array.from({ length: rows }, (_, index) => (
          <Skeleton key={index} className="h-5 w-full" />
        ))}
      </Card>
    </LoadingRegion>
  );
}

export function Notice({
  tone = "info",
  children,
}: {
  tone?: "info" | "warning";
  children: ReactNode;
}) {
  return (
    <div
      className={
        tone === "warning"
          ? "rounded-card border border-[#ecd9ac] bg-warning-50 p-4 text-sm"
          : "rounded-card border border-primary-200 bg-primary-50 p-4 text-sm"
      }
    >
      {children}
    </div>
  );
}
