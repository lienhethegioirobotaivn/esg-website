"use client";

import { PageHeader } from "@/features/backoffice/components/page-header";
import { LoadError, Loading } from "@/features/backoffice/components/states";
import { useResource } from "@/features/backoffice/lib/use-resource";

import { toPost, type ApiPostDetail } from "../lib/posts";
import { PostEditor } from "./post-editor";

const BACK = { href: "/quan-tri/bai-viet", label: "Danh sách bài viết" };

export function PostEditorPage({ id }: { id: string }) {
  const resource = useResource<ApiPostDetail>(`/admin/posts/${id}`);

  if (resource.data === null) {
    return (
      <div className="space-y-4">
        <PageHeader title="Sửa bài viết" back={BACK} />
        {resource.error ? (
          <LoadError error={resource.error} onRetry={resource.reload} />
        ) : (
          <Loading rows={8} />
        )}
      </div>
    );
  }

  return <PostEditor key={resource.data.id} initial={toPost(resource.data)} />;
}
