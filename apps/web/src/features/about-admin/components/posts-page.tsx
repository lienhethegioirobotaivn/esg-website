"use client";

import { ExternalLink, Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { IconButton } from "@/components/ui";
import { SECTION_LABELS, postPath } from "@/features/about/constants";
import { Badge } from "@/features/backoffice/components/badge";
import { ConfirmDialog } from "@/features/backoffice/components/confirm-dialog";
import {
  DataTable,
  Pagination,
} from "@/features/backoffice/components/data-table";
import {
  FilterBar,
  FilterSelect,
  SearchBox,
} from "@/features/backoffice/components/filters";
import { PageHeader } from "@/features/backoffice/components/page-header";
import { LoadError, Loading } from "@/features/backoffice/components/states";
import { useNotify } from "@/features/backoffice/components/toast";
import { sendJson, withQuery } from "@/features/backoffice/lib/api";
import { formatDate } from "@/features/backoffice/lib/dates";
import { toOptions } from "@/features/backoffice/lib/labels";
import {
  PAGE_SIZE,
  useQueryState,
} from "@/features/backoffice/lib/use-query-state";
import { useResource } from "@/features/backoffice/lib/use-resource";

import type { ApiPostSummary } from "../lib/posts";

const STATUS_LABELS = { published: "Đã đăng", draft: "Nháp" } as const;

export function PostsPage() {
  const query = useQueryState();
  const notify = useNotify();
  const [target, setTarget] = useState<ApiPostSummary | null>(null);
  const filters = {
    q: query.get("q"),
    section: query.get("section"),
    status: query.get("status"),
  };
  const list = useResource<{ posts: ApiPostSummary[]; total: number }>(
    withQuery("/admin/posts", {
      ...filters,
      limit: PAGE_SIZE,
      offset: query.offset,
    }),
  );

  async function remove(post: ApiPostSummary) {
    await sendJson("DELETE", `/admin/posts/${post.id}`);
    setTarget(null);
    notify("Đã xóa bài viết.");
    list.reload();
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Bài viết"
        description="Bài ở mục Thành tựu và Tin tức."
        actions={
          <Link
            href="/quan-tri/bai-viet/moi"
            className="inline-flex min-h-10 items-center gap-2 rounded-control bg-primary-800 px-4 text-sm font-medium text-white hover:bg-primary-900"
          >
            <Plus aria-hidden className="size-4" />
            Đăng bài mới
          </Link>
        }
      />
      <FilterBar active={query.active} onClear={query.clear}>
        <SearchBox
          value={filters.q}
          placeholder="Tiêu đề hoặc nội dung tóm tắt"
          onChange={(q) => query.set({ q })}
        />
        <FilterSelect
          label="Mục"
          value={filters.section}
          options={toOptions(SECTION_LABELS)}
          onChange={(section) => query.set({ section })}
        />
        <FilterSelect
          label="Trạng thái"
          value={filters.status}
          options={toOptions(STATUS_LABELS)}
          onChange={(status) => query.set({ status })}
        />
      </FilterBar>
      {list.error ? (
        <LoadError error={list.error} onRetry={list.reload} />
      ) : null}
      {list.data ? (
        <>
          <DataTable
            label="Danh sách bài viết"
            rows={list.data.posts}
            rowKey={(post) => post.id}
            busy={list.loading}
            minWidth="min-w-200"
            empty={
              query.active
                ? "Không có bài viết nào khớp bộ lọc."
                : "Chưa có bài viết nào."
            }
            columns={[
              {
                header: "Tiêu đề",
                className: "max-w-100",
                cell: (post) => (
                  <Link
                    href={`/quan-tri/bai-viet/${post.id}`}
                    className="font-semibold text-primary-700 hover:underline"
                  >
                    {post.title}
                  </Link>
                ),
              },
              {
                header: "Mục",
                cell: (post) => (
                  <>
                    <div>{SECTION_LABELS[post.section]}</div>
                    <div className="text-xs text-muted">{post.category}</div>
                  </>
                ),
              },
              {
                header: "Ngày đăng",
                cell: (post) => formatDate(`${post.publishedAt}T00:00:00+07:00`),
              },
              {
                header: "Trạng thái",
                cell: (post) => (
                  <Badge tone={post.status === "published" ? "green" : "gray"}>
                    {STATUS_LABELS[post.status]}
                  </Badge>
                ),
              },
              {
                header: "Tim",
                cell: (post) => (
                  <span className="tabular-nums">{post.likes}</span>
                ),
              },
              {
                header: <span className="sr-only">Thao tác</span>,
                cell: (post) => (
                  <div className="flex justify-end gap-1">
                    {post.status === "published" ? (
                      <Link
                        href={postPath(post.section, post.slug)}
                        target="_blank"
                        aria-label={`Xem bài ${post.title} trên website`}
                        title="Xem trên website"
                        className="inline-flex size-8 items-center justify-center rounded-md text-subtle hover:bg-surface-muted hover:text-foreground"
                      >
                        <ExternalLink aria-hidden className="size-4" />
                      </Link>
                    ) : null}
                    <Link
                      href={`/quan-tri/bai-viet/${post.id}`}
                      aria-label={`Sửa bài ${post.title}`}
                      title="Sửa"
                      className="inline-flex size-8 items-center justify-center rounded-md text-subtle hover:bg-surface-muted hover:text-foreground"
                    >
                      <Pencil aria-hidden className="size-4" />
                    </Link>
                    <IconButton
                      label={`Xóa bài ${post.title}`}
                      tone="danger"
                      onClick={() => setTarget(post)}
                    >
                      <Trash2 aria-hidden className="size-4" />
                    </IconButton>
                  </div>
                ),
              },
            ]}
          />
          <Pagination
            page={query.page}
            total={list.data.total}
            onChange={(page) => query.set({ page: String(page) })}
          />
        </>
      ) : list.loading ? (
        <Loading />
      ) : null}
      {target ? (
        <ConfirmDialog
          title="Xóa bài viết"
          confirmLabel="Xóa bài viết"
          busyLabel="Đang xóa..."
          onConfirm={() => remove(target)}
          onCancel={() => setTarget(null)}
        >
          <p>
            Bạn sắp xóa bài{" "}
            <strong className="text-foreground">
              &ldquo;{target.title}&rdquo;
            </strong>
            . Ảnh chỉ bài này dùng sẽ được dọn tự động. Không hoàn tác được.
          </p>
        </ConfirmDialog>
      ) : null}
    </div>
  );
}
