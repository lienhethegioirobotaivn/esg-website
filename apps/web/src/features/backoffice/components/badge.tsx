import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

import type { Tone } from "../lib/labels";

const TONES: Readonly<Record<Tone, string>> = {
  gray: "bg-surface-muted text-muted border-border",
  green: "bg-primary-100 text-primary-900 border-primary-200",
  amber: "bg-warning-50 text-[#7a4f0c] border-[#ecd9ac]",
  red: "bg-danger-50 text-[#96291e] border-[#f0c3bd]",
  blue: "bg-[#e8f0fa] text-[#1d4a7a] border-[#c5d8ee]",
};

export function Badge({
  tone = "gray",
  children,
}: {
  tone?: Tone;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-block whitespace-nowrap rounded-control border px-2 py-0.5 text-xs font-semibold",
        TONES[tone],
      )}
    >
      {children}
    </span>
  );
}
