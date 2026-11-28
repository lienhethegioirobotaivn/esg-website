"use client";

import { ChevronRight } from "lucide-react";
import { useId, type ReactNode } from "react";

import { Field, Input, Textarea } from "@/components/ui";
import { Choice } from "@/features/backoffice/components/choice";

interface Option {
  value: string;
  label: string;
}

interface BaseProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  error?: string;
  required?: boolean;
}

export function withCurrent(
  options: readonly Option[],
  value: string,
): readonly Option[] {
  return value === "" || options.some((option) => option.value === value)
    ? options
    : [...options, { value, label: value }];
}

export function TextField({
  label,
  value,
  onChange,
  hint,
  error,
  required,
  maxLength,
  type = "text",
  placeholder,
  readOnly,
  suggestions,
}: BaseProps & {
  maxLength?: number;
  type?: "text" | "date";
  placeholder?: string;
  readOnly?: boolean;
  suggestions?: readonly string[];
}) {
  const id = useId();
  return (
    <Field
      label={label}
      htmlFor={id}
      hint={hint}
      error={error}
      required={required}
    >
      <Input
        id={id}
        type={type}
        value={value}
        maxLength={maxLength}
        placeholder={placeholder}
        readOnly={readOnly}
        className={readOnly ? "bg-surface-muted" : undefined}
        aria-invalid={error ? true : undefined}
        list={suggestions ? `${id}-list` : undefined}
        onChange={(event) => onChange(event.target.value)}
      />
      {suggestions ? (
        <datalist id={`${id}-list`}>
          {suggestions.map((item) => (
            <option key={item} value={item} />
          ))}
        </datalist>
      ) : null}
    </Field>
  );
}

export function AreaField({
  label,
  value,
  onChange,
  hint,
  error,
  required,
  maxLength = 4000,
  rows = 2,
}: BaseProps & { maxLength?: number; rows?: number }) {
  const id = useId();
  return (
    <Field
      label={label}
      htmlFor={id}
      hint={hint}
      error={error}
      required={required}
    >
      <Textarea
        id={id}
        rows={rows}
        className="min-h-0 field-sizing-content"
        maxLength={maxLength}
        value={value}
        aria-invalid={error ? true : undefined}
        onChange={(event) => onChange(event.target.value)}
      />
    </Field>
  );
}

export function ChoiceField({
  label,
  value,
  options,
  onChange,
  emptyLabel,
  hint,
  error,
  required,
}: BaseProps & { options: readonly Option[]; emptyLabel?: string }) {
  const id = useId();
  return (
    <Field
      label={label}
      htmlFor={id}
      hint={hint}
      error={error}
      required={required}
    >
      <Choice
        id={id}
        value={value}
        options={withCurrent(options, value)}
        emptyLabel={emptyLabel}
        aria-invalid={error ? true : undefined}
        onChange={(event) => onChange(event.target.value)}
      />
    </Field>
  );
}

export function Section({
  title,
  summary,
  defaultOpen = false,
  children,
}: {
  title: string;
  summary?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  return (
    <details
      open={defaultOpen}
      className="group rounded-card border border-border bg-surface"
    >
      <summary className="flex cursor-pointer list-none items-center gap-2 p-4 [&::-webkit-details-marker]:hidden">
        <ChevronRight
          aria-hidden
          className="size-4 shrink-0 text-subtle transition-transform group-open:rotate-90"
        />
        <span className="text-sm font-semibold">{title}</span>
        {summary ? (
          <span className="ml-auto text-right text-xs text-muted">
            {summary}
          </span>
        ) : null}
      </summary>
      <div className="space-y-4 border-t border-border p-4">{children}</div>
    </details>
  );
}
