"use client";

import { Search, X } from "lucide-react";
import { useEffect, useId, useState, type ReactNode } from "react";

import { Button, Card, Input } from "@/components/ui";
import { controlClassName } from "@/components/ui/control-styles";
import { cn } from "@/lib/cn";

const SEARCH_DELAY_MS = 350;

export function FilterBar({
  children,
  active,
  onClear,
}: {
  children: ReactNode;
  active: boolean;
  onClear: () => void;
}) {
  return (
    <Card className="flex flex-wrap items-end gap-3 p-4">
      {children}
      {active ? (
        <Button
          variant="ghost"
          onClick={onClear}
          leadingIcon={<X aria-hidden className="size-4" />}
        >
          Xóa lọc
        </Button>
      ) : null}
    </Card>
  );
}

export function SearchBox({
  value,
  placeholder,
  onChange,
}: {
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  const id = useId();
  const [draft, setDraft] = useState(value);
  const [seen, setSeen] = useState(value);

  if (value !== seen) {
    setSeen(value);
    if (value !== draft.trim()) {
      setDraft(value);
    }
  }

  useEffect(() => {
    if (draft.trim() === value) {
      return;
    }
    const timer = window.setTimeout(
      () => onChange(draft.trim()),
      SEARCH_DELAY_MS,
    );
    return () => window.clearTimeout(timer);
  }, [draft, value, onChange]);

  return (
    <div className="min-w-56 flex-[2_1_16rem] space-y-1">
      <label htmlFor={id} className="block text-xs font-semibold">
        Tìm kiếm
      </label>
      <div className="relative">
        <Search
          aria-hidden
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle"
        />
        <Input
          id={id}
          type="search"
          maxLength={100}
          className="pl-9"
          placeholder={placeholder}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
        />
      </div>
    </div>
  );
}

export function FilterSelect({
  label,
  value,
  options,
  allLabel = "Tất cả",
  onChange,
  className,
}: {
  label: string;
  value: string;
  options: readonly { value: string; label: string }[];
  allLabel?: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  const id = useId();
  return (
    <div className={cn("min-w-40 flex-[1_1_10rem] space-y-1", className)}>
      <label htmlFor={id} className="block text-xs font-semibold">
        {label}
      </label>
      <select
        id={id}
        className={controlClassName}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">{allLabel}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
