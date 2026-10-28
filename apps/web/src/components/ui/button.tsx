import type { ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/cn";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "md" | "sm";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
}

const variantClassNames: Record<ButtonVariant, string> = {
  primary: "bg-primary-800 text-white hover:bg-primary-900",
  secondary:
    "border border-border bg-surface text-foreground hover:border-border-strong hover:bg-surface-muted",
  ghost: "text-muted hover:bg-surface-muted hover:text-foreground",
  danger: "bg-danger-600 text-white hover:bg-danger-600/90",
};

const sizeClassNames: Record<ButtonSize, string> = {
  md: "min-h-10 px-4 py-2 text-sm",
  sm: "min-h-8 px-3 py-1.5 text-[0.8125rem]",
};

export function Button({
  variant = "primary",
  size = "md",
  leadingIcon,
  trailingIcon,
  className,
  type = "button",
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-control text-center font-medium leading-snug transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        variantClassNames[variant],
        sizeClassNames[size],
        className,
      )}
      {...props}
    >
      {leadingIcon ? (
        <span className="inline-flex shrink-0">{leadingIcon}</span>
      ) : null}
      {children}
      {trailingIcon ? (
        <span className="inline-flex shrink-0">{trailingIcon}</span>
      ) : null}
    </button>
  );
}
