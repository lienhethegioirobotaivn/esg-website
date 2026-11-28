"use client";

import type { StatItem } from "@esg/shared";

import { PageHeader } from "@/features/backoffice/components/page-header";
import { LoadError, Loading } from "@/features/backoffice/components/states";
import { formatDateTime } from "@/features/backoffice/lib/dates";
import { useResource } from "@/features/backoffice/lib/use-resource";

import { StatsEditor } from "./stats-editor";

export function StatsPage() {
  const resource = useResource<{
    items: StatItem[];
    updatedAt: string | null;
  }>("/admin/stats");

  return (
    <div className="max-w-4xl space-y-4">
      <PageHeader
        title="Số liệu thành tựu"
        description={
          <>
            Hiển thị ở dải màu xanh đầu trang Thành tựu. Xóa hết số liệu và lưu
            thì dải này sẽ ẩn.
            {resource.data?.updatedAt
              ? ` Lưu lần cuối ${formatDateTime(resource.data.updatedAt)}.`
              : ""}
          </>
        }
      />
      {resource.error ? (
        <LoadError error={resource.error} onRetry={resource.reload} />
      ) : null}
      {resource.data ? (
        <StatsEditor initial={resource.data.items} onSaved={resource.replace} />
      ) : resource.loading ? (
        <Loading rows={4} />
      ) : null}
    </div>
  );
}
