"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { IconButton } from "@/components/ui";
import { SECTION_LABELS, postPath } from "@/features/about/constants";
import type { Post } from "@/features/about/types";

import { AdminApiError, deletePost } from "../lib/admin-api";

interface PostsTableProps {
  posts: Post[];
  isConfigured: boolean;
}

export function PostsTable({ posts, isConfigured }: PostsTableProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function handleDelete(post: Post) {
    if (!window.confirm(`Xóa bài "${post.title}"? Thao tác này không thể hoàn tác.`)) {
      return;
    }
    setError(null);
    setBusyId(post.id);
    try {
      await deletePost(post.id);
      router.refresh();
    } catch (caught) {
      setError(
        caught instanceof AdminApiError ? caught.message : "Không xóa được bài viết.",
      );
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl text-primary-800">Bài viết</h1>
        <div className="flex gap-2">
          <Link
            href="/quan-tri/so-lieu"
            className="inline-flex min-h-10 items-center rounded-control border border-border bg-surface px-4 text-sm font-medium hover:bg-surface-muted"
          >
            Số liệu thành tựu
          </Link>
          <Link
            href="/quan-tri/bai-viet/moi"
            className="inline-flex min-h-10 items-center gap-2 rounded-control bg-primary-800 px-4 text-sm font-medium text-white hover:bg-primary-900"
          >
            <Plus aria-hidden className="size-4" />
            Đăng bài mới
          </Link>
        </div>
      </div>

      {!isConfigured ? (
        <p className="mt-4 rounded-card border border-warning-200 bg-warning-50 p-4 text-sm">
          Chưa cấu hình <code>GOOGLE_APPS_SCRIPT_URL</code> và{" "}
          <code>GOOGLE_APPS_SCRIPT_SECRET</code>, nên chưa thể lưu hay đọc bài viết.
          Website đang hiển thị dữ liệu mẫu.
        </p>
      ) : null}

      {error ? (
        <p role="alert" className="mt-4 text-sm text-danger-600">
          {error}
        </p>
      ) : null}

      <div className="mt-4 overflow-x-auto rounded-card border border-border bg-surface">
        <table className="w-full min-w-170 text-left text-sm">
          <thead className="border-b border-border bg-surface-muted text-xs uppercase text-subtle">
            <tr>
              <th className="px-4 py-2.5 font-semibold">Tiêu đề</th>
              <th className="px-4 py-2.5 font-semibold">Mục</th>
              <th className="px-4 py-2.5 font-semibold">Chuyên mục</th>
              <th className="px-4 py-2.5 font-semibold">Ngày đăng</th>
              <th className="px-4 py-2.5 font-semibold">Trạng thái</th>
              <th className="px-4 py-2.5 font-semibold">Tim</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {posts.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-muted">
                  Chưa có bài viết nào.
                </td>
              </tr>
            ) : (
              posts.map((post) => (
                <tr key={post.id}>
                  <td className="max-w-80 px-4 py-3 font-medium">
                    <Link
                      href={`/quan-tri/bai-viet/${encodeURIComponent(post.id)}`}
                      className="hover:text-primary-700 hover:underline"
                    >
                      {post.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{SECTION_LABELS[post.section]}</td>
                  <td className="px-4 py-3">{post.category}</td>
                  <td className="px-4 py-3 tabular-nums">{post.publishedAt}</td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        post.status === "published"
                          ? "rounded-full bg-primary-100 px-2.5 py-0.5 text-xs font-bold text-primary-900"
                          : "rounded-full bg-surface-muted px-2.5 py-0.5 text-xs font-bold text-muted"
                      }
                    >
                      {post.status === "published" ? "Đã đăng" : "Nháp"}
                    </span>
                  </td>
                  <td className="px-4 py-3 tabular-nums">{post.likes}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      {post.status === "published" ? (
                        <Link
                          href={postPath(post.section, post.slug)}
                          target="_blank"
                          className="inline-flex min-h-8 items-center rounded-control px-2 text-[0.8125rem] text-muted hover:bg-surface-muted"
                        >
                          Xem
                        </Link>
                      ) : null}
                      <Link
                        href={`/quan-tri/bai-viet/${encodeURIComponent(post.id)}`}
                        aria-label={`Sửa bài ${post.title}`}
                        className="inline-flex size-8 items-center justify-center rounded-md text-subtle hover:bg-surface-muted hover:text-foreground"
                      >
                        <Pencil aria-hidden className="size-4" />
                      </Link>
                      <IconButton
                        label={`Xóa bài ${post.title}`}
                        tone="danger"
                        disabled={busyId === post.id}
                        onClick={() => void handleDelete(post)}
                      >
                        <Trash2 aria-hidden className="size-4" />
                      </IconButton>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

