import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/cn";

interface IconButtonProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "aria-label"
> {
  label: string;
  tone?: "default" | "danger";
}

export function IconButton({
  label,
  tone = "default",
  className,
  type = "button",
  children,
  ...props
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex size-8 shrink-0 items-center justify-center rounded-md text-subtle transition-colors disabled:cursor-not-allowed disabled:opacity-40",
        tone === "danger"
          ? "enabled:hover:bg-danger-50 enabled:hover:text-danger-600"
          : "enabled:hover:bg-surface-muted enabled:hover:text-foreground",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
