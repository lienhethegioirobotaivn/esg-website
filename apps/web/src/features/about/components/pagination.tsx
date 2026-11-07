import { cn } from "@/lib/cn";

interface PaginationProps {
  page: number;
  pageCount: number;
  onChange: (page: number) => void;
  moreLabel: string;
}

export function Pagination({
  page,
  pageCount,
  onChange,
  moreLabel,
}: PaginationProps) {
  if (pageCount <= 1) {
    return null;
  }
  return (
    <nav
      aria-label="Phân trang"
      className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4"
    >
      <ul className="flex items-center gap-2">
        {Array.from({ length: pageCount }, (_, index) => index + 1).map(
          (item) => (
            <li key={item}>
              <button
                type="button"
                onClick={() => onChange(item)}
                aria-current={item === page ? "page" : undefined}
                className={cn(
                  "size-9 rounded-control text-sm font-semibold transition-colors",
                  item === page
                    ? "bg-primary-800 text-white"
                    : "border border-border bg-surface text-foreground hover:bg-surface-muted",
                )}
              >
                {item}
              </button>
            </li>
          ),
        )}
      </ul>
      {page < pageCount ? (
        <button
          type="button"
          onClick={() => onChange(page + 1)}
          className="rounded-control border border-border bg-surface px-4 py-2 text-sm font-semibold text-primary-800 transition-colors hover:bg-surface-muted"
        >
          {moreLabel}
        </button>
      ) : null}
    </nav>
  );
}
