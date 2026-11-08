import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/cn";

export function Skeleton({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden
      className={cn("animate-pulse rounded-md bg-border", className)}
      {...props}
    />
  );
}

interface LoadingRegionProps {
  label?: string;
  className?: string;
  children: ReactNode;
}

export function LoadingRegion({
  label = "Đang tải nội dung...",
  className,
  children,
}: LoadingRegionProps) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-live="polite"
      className={className}
    >
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}
