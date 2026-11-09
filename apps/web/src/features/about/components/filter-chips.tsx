import { useT } from "@/features/locale";
import { cn } from "@/lib/cn";

interface FilterChipsProps {
  options: readonly string[];
  value: string;
  onChange: (value: string) => void;
  allLabel?: string;
}

export function FilterChips({
  options,
  value,
  onChange,
  allLabel,
}: FilterChipsProps) {
  const t = useT();
  const all = allLabel ?? t("Tất cả");
  const items = [all, ...options];
  return (
    <div role="group" aria-label={t("Lọc theo chủ đề")} className="flex flex-wrap gap-2">
      {items.map((item) => {
        const isActive = (item === all ? "" : item) === value;
        return (
          <button
            key={item}
            type="button"
            aria-pressed={isActive}
            onClick={() => onChange(item === all ? "" : item)}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-semibold transition-colors",
              isActive
                ? "bg-primary-200 text-primary-900"
                : "text-foreground hover:bg-surface-muted",
            )}
          >
            {item === all ? item : t(item)}
          </button>
        );
      })}
    </div>
  );
}
