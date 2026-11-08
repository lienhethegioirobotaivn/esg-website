import { Card, LoadingRegion, Skeleton } from "@/components/ui";

export function PostsTableSkeleton() {
  return (
    <LoadingRegion label="Đang tải danh sách bài viết...">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Skeleton className="h-8 w-32" />
        <div className="flex gap-2">
          <Skeleton className="h-10 w-40 rounded-control" />
          <Skeleton className="h-10 w-36 rounded-control" />
        </div>
      </div>
      <div className="mt-4 overflow-hidden rounded-card border border-border bg-surface">
        <div className="border-b border-border bg-surface-muted px-4 py-3">
          <Skeleton className="h-3 w-full max-w-md" />
        </div>
        <div className="divide-y divide-border">
          {[0, 1, 2, 3, 4, 5].map((row) => (
            <div key={row} className="flex items-center gap-4 px-4 py-4">
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="hidden h-4 w-20 sm:block" />
              <Skeleton className="hidden h-4 w-24 md:block" />
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="size-8" />
            </div>
          ))}
        </div>
      </div>
    </LoadingRegion>
  );
}

export function PostEditorSkeleton() {
  return (
    <LoadingRegion label="Đang tải trình soạn bài...">
      <Skeleton className="h-4 w-36" />
      <Skeleton className="mt-2 h-8 w-64" />
      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-5">
          <Card className="space-y-4 p-5">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-24 w-full" />
          </Card>
          <Card className="space-y-3 p-5">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-72 w-full" />
          </Card>
        </div>
        <div className="space-y-5">
          <Card className="space-y-4 p-5">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </Card>
          <Card className="space-y-3 p-5">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="aspect-video w-full rounded-card" />
          </Card>
        </div>
      </div>
    </LoadingRegion>
  );
}

export function StatsEditorSkeleton() {
  return (
    <LoadingRegion label="Đang tải số liệu...">
      <Skeleton className="h-4 w-36" />
      <Skeleton className="mt-2 h-8 w-56" />
      <Skeleton className="mt-3 h-4 w-full max-w-lg" />
      <Card className="mt-5 space-y-3 p-5">
        {[0, 1, 2, 3].map((row) => (
          <div key={row} className="flex items-center gap-2">
            <Skeleton className="h-10 w-40" />
            <Skeleton className="h-10 flex-1" />
            <Skeleton className="h-8 w-24" />
          </div>
        ))}
      </Card>
    </LoadingRegion>
  );
}
