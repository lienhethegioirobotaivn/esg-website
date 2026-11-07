import { Bar, PlaceholderCard } from "./skeleton";

export function ForestryPreview() {
  return (
    <div aria-hidden className="select-none">
      <Bar className="w-40" />
      <h1 className="mt-4 text-4xl font-bold">Chọn dự án trồng rừng</h1>
      <Bar className="mt-3 w-2/3 max-w-xl" />
      <div className="mt-6 flex gap-3">
        <div className="h-9 w-32 rounded-control bg-primary-300" />
        <div className="h-9 w-32 rounded-control bg-primary-100" />
      </div>
      <div className="mt-4 flex gap-3">
        <div className="h-9 w-40 rounded-control bg-surface-muted" />
        <div className="h-9 w-28 rounded-control bg-surface-muted" />
      </div>
      <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <PlaceholderCard />
        <PlaceholderCard />
        <PlaceholderCard />
      </div>
    </div>
  );
}
