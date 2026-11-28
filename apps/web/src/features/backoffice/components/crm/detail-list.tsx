import type { ReactNode } from "react";

export function DetailList({
  items,
}: {
  items: readonly { label: string; value: ReactNode }[];
}) {
  return (
    <dl className="space-y-2.5 text-sm">
      {items.map((item) => (
        <div key={item.label} className="flex flex-wrap gap-x-3 gap-y-0.5">
          <dt className="w-40 shrink-0 text-muted">{item.label}</dt>
          <dd className="min-w-0 flex-[1_1_12rem] whitespace-pre-line break-words">
            {item.value === null || item.value === "" ? (
              <span className="text-subtle">Chưa có</span>
            ) : (
              item.value
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function EmailLink({ value }: { value: string | null }) {
  return value ? (
    <a href={`mailto:${value}`} className="text-primary-700 hover:underline">
      {value}
    </a>
  ) : null;
}

export function PhoneLink({ value }: { value: string | null }) {
  return value ? (
    <a
      href={`tel:${value.replace(/[^0-9+]/g, "")}`}
      className="text-primary-700 hover:underline"
    >
      {value}
    </a>
  ) : null;
}
