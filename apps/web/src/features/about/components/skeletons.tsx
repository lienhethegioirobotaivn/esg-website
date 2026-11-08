import { LoadingRegion, Skeleton } from "@/components/ui";

function CardSkeleton({ large = false }: { large?: boolean }) {
  return (
    <div className="space-y-3">
      <Skeleton className="aspect-video w-full rounded-card" />
      <Skeleton className="h-3 w-20 rounded-full" />
      <Skeleton className={large ? "h-7 w-11/12" : "h-5 w-11/12"} />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  );
}

function ChipsSkeleton() {
  return (
    <div className="flex flex-wrap gap-2">
      {[20, 28, 24, 32, 20].map((width, index) => (
        <Skeleton
          key={index}
          className="h-8 rounded-full"
          style={{ width: `${width * 4}px` }}
        />
      ))}
    </div>
  );
}

export function AchievementsSkeleton() {
  return (
    <LoadingRegion label="Đang tải trang Thành tựu...">
      <Skeleton className="h-10 w-80 max-w-full" />
      <div className="mt-6 grid gap-px overflow-hidden rounded-card sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((item) => (
          <Skeleton key={item} className="h-24 rounded-none" />
        ))}
      </div>
      <div className="mt-8 flex flex-col gap-4 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between">
        <ChipsSkeleton />
        <Skeleton className="h-10 w-full sm:w-72" />
      </div>
      <Skeleton className="mt-8 h-8 w-64" />
      <div className="mt-6 grid gap-8 border-b border-border pb-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <CardSkeleton large />
        <div className="space-y-6">
          <CardSkeleton />
        </div>
      </div>
      <div className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((item) => (
          <CardSkeleton key={item} />
        ))}
      </div>
    </LoadingRegion>
  );
}

export function NewsSkeleton() {
  return (
    <LoadingRegion label="Đang tải trang Tin tức...">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Skeleton className="h-10 w-96 max-w-full" />
        <Skeleton className="h-10 w-full sm:w-72" />
      </div>
      <div className="mt-4 border-b border-border pb-3">
        <ChipsSkeleton />
      </div>
      <div className="mt-6 grid gap-8 border-b border-border pb-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,4fr)_minmax(0,3fr)]">
        <CardSkeleton large />
        <CardSkeleton />
        <div className="space-y-4">
          <Skeleton className="h-6 w-32" />
          {[0, 1, 2, 3].map((item) => (
            <Skeleton key={item} className="h-5 w-full" />
          ))}
        </div>
      </div>
      <Skeleton className="mt-8 h-7 w-48" />
      <div className="mt-5 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((item) => (
          <CardSkeleton key={item} />
        ))}
      </div>
    </LoadingRegion>
  );
}

export function ArticleSkeleton() {
  return (
    <LoadingRegion label="Đang tải bài viết...">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 space-y-4">
          <Skeleton className="h-6 w-28 rounded-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-2/3" />
          <Skeleton className="h-4 w-56" />
          <Skeleton className="h-14 w-full rounded-card" />
          <Skeleton className="h-6 w-full" />
          <Skeleton className="aspect-[2.7/1] w-full rounded-card" />
          {[100, 96, 100, 90, 60].map((width, index) => (
            <Skeleton
              key={index}
              className="h-4"
              style={{ width: `${width}%` }}
            />
          ))}
        </div>
        <div className="space-y-5 lg:border-l lg:border-border lg:pl-8">
          <Skeleton className="h-6 w-44" />
          {[0, 1].map((item) => (
            <div key={item} className="space-y-3">
              <Skeleton className="aspect-video w-full rounded-card" />
              <Skeleton className="h-5 w-11/12" />
            </div>
          ))}
        </div>
      </div>
    </LoadingRegion>
  );
}
