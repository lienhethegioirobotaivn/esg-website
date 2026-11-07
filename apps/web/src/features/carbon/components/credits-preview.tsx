import { Bar, PlaceholderCard } from "./skeleton";

const FILTER_GROUPS = [4, 3, 3, 2] as const;

export function CreditsPreview() {
  return (
    <div aria-hidden className="select-none">
      <Bar className="w-40" />
      <h1 className="mt-4 text-4xl font-bold">Chọn tín chỉ carbon phù hợp</h1>
      <Bar className="mt-3 w-2/3 max-w-xl" />
      <div className="mt-6 flex gap-3">
        <div className="h-9 w-32 rounded-control bg-primary-300" />
        <div className="h-9 w-32 rounded-control bg-primary-100" />
        <div className="h-9 w-32 rounded-control bg-primary-100" />
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-[14rem_minmax(0,1fr)]">
        <div className="hidden space-y-6 lg:block">
          {FILTER_GROUPS.map((rows, group) => (
            <div key={group} className="space-y-3">
              <div className="h-4 w-24 rounded bg-primary-300" />
              {Array.from({ length: rows }, (_, row) => (
                <Bar key={row} className="w-full" />
              ))}
            </div>
          ))}
        </div>
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          <PlaceholderCard />
          <PlaceholderCard />
          <PlaceholderCard />
        </div>
      </div>
    </div>
  );
}
