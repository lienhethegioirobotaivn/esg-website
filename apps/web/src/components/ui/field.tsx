import type { ReactNode } from "react";

interface FieldProps {
  label: string;
  htmlFor: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: ReactNode;
}

export function Field({
  label,
  htmlFor,
  required = false,
  hint,
  error,
  children,
}: FieldProps) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={htmlFor}
        className="block text-[0.8125rem] font-medium text-foreground"
      >
        {label}
        {required ? (
          <span aria-hidden className="ml-1 text-primary-600">
            *
          </span>
        ) : null}
      </label>
      {hint ? (
        <p id={`${htmlFor}-hint`} className="text-xs leading-relaxed text-subtle">
          {hint}
        </p>
      ) : null}
      {children}
      {error ? (
        <p
          id={`${htmlFor}-error`}
          role="alert"
          className="text-xs text-danger-600"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
