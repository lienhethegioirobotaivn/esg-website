import { cn } from "@/lib/cn";

interface SwitchProps {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
}

export function Switch({
  id,
  checked,
  onChange,
  label,
  description,
}: SwitchProps) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-control border border-border p-3.5">
      <div className="min-w-0">
        <p id={`${id}-label`} className="text-sm font-medium">
          {label}
        </p>
        {description ? (
          <p className="mt-0.5 text-xs text-subtle">{description}</p>
        ) : null}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={`${id}-label`}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors",
          checked ? "bg-primary-600" : "bg-border-strong",
        )}
      >
        <span
          aria-hidden
          className={cn(
            "inline-block size-5 rounded-full bg-white shadow transition-transform",
            checked ? "translate-x-5.5" : "translate-x-0.5",
          )}
        />
      </button>
    </div>
  );
}
