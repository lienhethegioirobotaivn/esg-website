"use client";

import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";

interface CollapsibleSectionProps {
  title: string;
  optional?: boolean;
  children: ReactNode;
}

export function CollapsibleSection({
  title,
  optional = true,
  children,
}: CollapsibleSectionProps) {
  return (
    <details className="group border-t border-border pt-4">
      <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold">
        <span>
          {title}
          {optional ? (
            <span className="font-normal text-subtle"> (không bắt buộc)</span>
          ) : null}
        </span>
        <ChevronDown
          aria-hidden
          className="size-4 transition-transform group-open:rotate-180"
        />
      </summary>
      <div className="mt-4 space-y-4">{children}</div>
    </details>
  );
}
