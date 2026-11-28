import { ChevronDown } from "lucide-react";
import type { SelectHTMLAttributes } from "react";

import { controlClassName } from "@/components/ui/control-styles";
import { cn } from "@/lib/cn";

interface ChoiceProps extends Omit<
  SelectHTMLAttributes<HTMLSelectElement>,
  "children"
> {
  options: readonly { value: string; label: string }[];
  emptyLabel?: string;
}

export function Choice({
  options,
  emptyLabel,
  className,
  ...props
}: ChoiceProps) {
  return (
    <div className="relative">
      <select
        className={cn(controlClassName, "appearance-none pr-10", className)}
        {...props}
      >
        {emptyLabel === undefined ? null : (
          <option value="">{emptyLabel}</option>
        )}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown
        aria-hidden
        className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-subtle"
      />
    </div>
  );
}
