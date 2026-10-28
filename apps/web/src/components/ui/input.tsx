import type { InputHTMLAttributes } from "react";

import { cn } from "@/lib/cn";

import { controlClassName } from "./control-styles";

export function Input({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(controlClassName, className)} {...props} />;
}
