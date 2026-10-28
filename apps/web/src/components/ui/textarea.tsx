import type { TextareaHTMLAttributes } from "react";

import { cn } from "@/lib/cn";

import { controlClassName } from "./control-styles";

export function Textarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(controlClassName, "min-h-24 resize-y", className)}
      {...props}
    />
  );
}
