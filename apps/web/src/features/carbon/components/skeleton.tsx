import { cn } from "@/lib/cn";

export function Bar({ className }: { className: string }) {
  return <div className={cn("h-3 rounded bg-primary-200", className)} />;
}

export function PlaceholderCard() {
  return (
    <div className="overflow-hidden rounded-card border border-border bg-surface">
      <div className="h-36 bg-linear-to-br from-primary-200 to-primary-400" />
      <div className="space-y-3 p-4">
        <Bar className="w-1/4" />
        <div className="h-5 w-3/4 rounded bg-primary-300" />
        <Bar className="w-full" />
        <Bar className="w-5/6" />
        <Bar className="w-2/3" />
        <div className="flex items-center justify-between pt-2">
          <Bar className="w-1/3" />
          <div className="h-9 w-28 rounded-control bg-primary-500" />
        </div>
      </div>
    </div>
  );
}
