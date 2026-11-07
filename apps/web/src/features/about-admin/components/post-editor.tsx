"use client";

import { postInputSchema } from "@esg/shared";
import type { PostBlock, PostSection } from "@esg/shared";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  Button,
  Card,
  Field,
  Input,
  Select,
  Switch,
  Textarea,
} from "@/components/ui";
import { ArticleView } from "@/features/about/components/article-view";
import {
  SECTION_CATEGORIES,
  SECTION_LABELS,
  postPath,
} from "@/features/about/constants";
import type { Post } from "@/features/about/types";

import { AdminApiError, savePost } from "../lib/admin-api";
import { slugify } from "../lib/slugify";
import { BlockEditor } from "./block-editor";
import { ImageField } from "./image-field";

interface PostEditorProps {
  initial: Post | null;
}

type Errors = Record<string, string>;

const SECTION_OPTIONS = (Object.keys(SECTION_LABELS) as PostSection[]).map(
  (value) => ({ value, label: SECTION_LABELS[value] }),
);

function today(): string {
  return new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export function PostEditor({ initial }: PostEditorProps) {
  const router = useRouter();
  const isNew = initial === null;
  const [section, setSection] = useState<PostSection>(
    initial?.section ?? "tin-tuc",
  );
  const [category, setCategory] = useState(initial?.category ?? "");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(!isNew);
  const [summary, setSummary] = useState(initial?.summary ?? "");
  const [coverUrl, setCoverUrl] = useState(initial?.coverUrl ?? "");
  const [author, setAuthor] = useState(
    initial?.author ?? "Ban biên tập ESG Report Online",
  );
  const [readMinutes, setReadMinutes] = useState(
    String(initial?.readMinutes ?? 4),
  );
  const [publishedAt, setPublishedAt] = useState(
    initial?.publishedAt.slice(0, 10) ?? today(),
  );
  const [featured, setFeatured] = useState(initial?.featured ?? false);
  const [popular, setPopular] = useState(initial?.popular ?? false);
  const [spotlight, setSpotlight] = useState(initial?.spotlight ?? false);
  const [body, setBody] = useState<PostBlock[]>(initial?.body ?? []);
  const [errors, setErrors] = useState<Errors>({});
  const [message, setMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savingStatus, setSavingStatus] = useState<
    "published" | "draft" | null
  >(null);
  const [showPreview, setShowPreview] = useState(false);

  const categories = SECTION_CATEGORIES[section];
  const categoryOptions = [
    ...categories,
    ...(category !== "" && !categories.includes(category) ? [category] : []),
  ].map((value) => ({ value, label: value }));

  function changeSection(next: PostSection) {
    setSection(next);
    if (!SECTION_CATEGORIES[next].includes(category)) {
      setCategory("");
    }
  }

  function changeTitle(next: string) {
    setTitle(next);
    if (!slugTouched) {
      setSlug(slugify(next));
    }
  }

  function buildInput(status: "published" | "draft") {
    return {
      ...(initial ? { id: initial.id } : {}),
      section,
      slug,
      category,
      title,
      summary,
      coverUrl,
      author,
      readMinutes: Number(readMinutes),
      publishedAt,
      featured,
      popular,
      spotlight,
      status,
      body,
    };
  }

  function collectErrors(
    issues: readonly { path: PropertyKey[]; message: string }[],
  ): Errors {
    const next: Errors = {};
    for (const issue of issues) {
      const key = String(issue.path[0] ?? "form");
      if (!(key in next)) {
        next[key] = issue.message;
      }
    }
    return next;
  }

  async function submit(status: "published" | "draft") {
    if (savingStatus !== null) {
      return;
    }
    setMessage(null);
    setSaveError(null);
    const input = buildInput(status);
    const parsed = postInputSchema.safeParse(input);
    if (!parsed.success) {
      setErrors(collectErrors(parsed.error.issues));
      setSaveError("Vui lòng kiểm tra các mục được đánh dấu.");
      return;
    }
    setErrors({});
    setSavingStatus(status);
    try {
      const id = await savePost(parsed.data);
      setMessage(status === "published" ? "Đã đăng bài." : "Đã lưu bản nháp.");
      if (isNew && id !== "") {
        router.replace(`/quan-tri/bai-viet/${encodeURIComponent(id)}`);
      }
      router.refresh();
    } catch (caught) {
      if (caught instanceof AdminApiError) {
        setErrors(caught.fields);
        setSaveError(caught.message);
        if (caught.status === 401) {
          router.refresh();
        }
      } else {
        setSaveError("Không lưu được bài viết. Vui lòng thử lại.");
      }
    } finally {
      setSavingStatus(null);
    }
  }

  const previewPost: Post = {
    id: initial?.id ?? "xem-truoc",
    slug: slug || "xem-truoc",
    section,
    category: category || "Chưa chọn chuyên mục",
    title: title || "Tiêu đề bài viết",
    summary: summary || "Tóm tắt bài viết",
    coverUrl: coverUrl === "" ? null : coverUrl,
    author,
    readMinutes: Number(readMinutes) || 1,
    publishedAt,
    likes: initial?.likes ?? 0,
    featured,
    popular,
    spotlight,
    status: initial?.status ?? "draft",
    isSample: false,
    body: body.filter((block) =>
      block.type === "callout"
        ? block.title.trim() !== "" || block.text.trim() !== ""
        : block.text.trim() !== "",
    ),
  };

  const busy = savingStatus !== null;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/quan-tri" className="text-sm text-muted hover:underline">
            ← Danh sách bài viết
          </Link>
          <h1 className="mt-1 text-2xl text-primary-800">
            {isNew ? "Đăng bài mới" : "Sửa bài viết"}
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          {initial && initial.status === "published" ? (
            <Link
              href={postPath(initial.section, initial.slug)}
              target="_blank"
              className="inline-flex min-h-10 items-center rounded-control border border-border bg-surface px-4 text-sm font-medium hover:bg-surface-muted"
            >
              Xem trên website
            </Link>
          ) : null}
          <Button
            variant="secondary"
            onClick={() => setShowPreview((current) => !current)}
            leadingIcon={
              showPreview ? (
                <EyeOff aria-hidden className="size-4" />
              ) : (
                <Eye aria-hidden className="size-4" />
              )
            }
          >
            {showPreview ? "Quay lại soạn thảo" : "Xem trước"}
          </Button>
        </div>
      </div>

      {showPreview ? (
        <div className="mt-6 rounded-card border border-border bg-background p-6">
          <ArticleView post={previewPost} related={[]} />
        </div>
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="space-y-5">
            <Card className="space-y-4 p-5">
              <Field
                label="Tiêu đề"
                htmlFor="post-title"
                required
                error={errors["title"]}
              >
                <Input
                  id="post-title"
                  value={title}
                  onChange={(event) => changeTitle(event.target.value)}
                  aria-invalid={Boolean(errors["title"])}
                />
              </Field>
              <Field
                label="Đường dẫn (slug)"
                htmlFor="post-slug"
                required
                hint="Chỉ gồm chữ thường không dấu, số và dấu gạch ngang. Tự tạo từ tiêu đề."
                error={errors["slug"]}
              >
                <Input
                  id="post-slug"
                  value={slug}
                  onChange={(event) => {
                    setSlugTouched(true);
                    setSlug(event.target.value);
                  }}
                  aria-invalid={Boolean(errors["slug"])}
                />
              </Field>
              <Field
                label="Tóm tắt"
                htmlFor="post-summary"
                required
                error={errors["summary"]}
              >
                <Textarea
                  id="post-summary"
                  rows={5}
                  value={summary}
                  onChange={(event) => setSummary(event.target.value)}
                  aria-invalid={Boolean(errors["summary"])}
                />
              </Field>
            </Card>

            <Card className="space-y-3 p-5">
              <h2 className="text-base">Nội dung bài viết</h2>
              {errors["body"] ? (
                <p role="alert" className="text-xs text-danger-600">
                  {errors["body"]}
                </p>
              ) : null}
              <BlockEditor blocks={body} onChange={setBody} />
            </Card>
          </div>

          <div className="space-y-5">
            <Card className="space-y-4 p-5">
              <Field
                label="Mục"
                htmlFor="post-section"
                required
                error={errors["section"]}
              >
                <Select
                  id="post-section"
                  options={SECTION_OPTIONS}
                  placeholder="Chọn mục"
                  value={section}
                  onChange={(event) =>
                    changeSection(event.target.value as PostSection)
                  }
                />
              </Field>
              <Field
                label="Chuyên mục"
                htmlFor="post-category"
                required
                error={errors["category"]}
              >
                <Select
                  id="post-category"
                  options={categoryOptions}
                  placeholder="Chọn chuyên mục"
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  aria-invalid={Boolean(errors["category"])}
                />
              </Field>
              <Field
                label="Tác giả"
                htmlFor="post-author"
                required
                error={errors["author"]}
              >
                <Input
                  id="post-author"
                  value={author}
                  onChange={(event) => setAuthor(event.target.value)}
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field
                  label="Phút đọc"
                  htmlFor="post-read"
                  required
                  error={errors["readMinutes"]}
                >
                  <Input
                    id="post-read"
                    type="number"
                    min={1}
                    max={120}
                    value={readMinutes}
                    onChange={(event) => setReadMinutes(event.target.value)}
                  />
                </Field>
                <Field
                  label="Ngày đăng"
                  htmlFor="post-date"
                  required
                  error={errors["publishedAt"]}
                >
                  <Input
                    id="post-date"
                    type="date"
                    value={publishedAt}
                    onChange={(event) => setPublishedAt(event.target.value)}
                  />
                </Field>
              </div>
            </Card>

            <Card className="space-y-3 p-5">
              <h2 className="text-base">Ảnh bìa</h2>
              <ImageField value={coverUrl} onChange={setCoverUrl} />
              {errors["coverUrl"] ? (
                <p role="alert" className="text-xs text-danger-600">
                  {errors["coverUrl"]}
                </p>
              ) : null}
            </Card>

            <Card className="space-y-3 p-5">
              <h2 className="text-base">Vị trí hiển thị</h2>
              <Switch
                id="post-featured"
                label="Nổi bật"
                description="Hiện ở khu bài nổi bật đầu trang (tối đa 3 bài mới nhất)"
                checked={featured}
                onChange={setFeatured}
              />
              <Switch
                id="post-popular"
                label="Đọc nhiều"
                description="Hiện trong danh sách Đọc nhiều (mục Tin tức)"
                checked={popular}
                onChange={setPopular}
              />
              <Switch
                id="post-spotlight"
                label="Chuyên đề nổi bật"
                description="Hiện ở khu Chuyên đề nổi bật (mục Tin tức)"
                checked={spotlight}
                onChange={setSpotlight}
              />
            </Card>
          </div>
        </div>
      )}

      <div className="sticky bottom-0 -mx-5 mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border bg-surface px-5 py-3 sm:-mx-8 sm:px-8 lg:-mx-10 lg:px-10">
        <div aria-live="polite" className="text-sm">
          {saveError ? (
            <span role="alert" className="text-danger-600">
              {saveError}
            </span>
          ) : message ? (
            <span className="text-primary-700">{message}</span>
          ) : initial ? (
            <span className="text-muted">
              Trạng thái hiện tại:{" "}
              {initial.status === "published" ? "Đã đăng" : "Nháp"}
            </span>
          ) : null}
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            disabled={busy}
            onClick={() => void submit("draft")}
            leadingIcon={
              savingStatus === "draft" ? (
                <Loader2 aria-hidden className="size-4 animate-spin" />
              ) : null
            }
          >
            Lưu nháp
          </Button>
          <Button
            disabled={busy}
            onClick={() => void submit("published")}
            leadingIcon={
              savingStatus === "published" ? (
                <Loader2 aria-hidden className="size-4 animate-spin" />
              ) : null
            }
          >
            {initial?.status === "published" ? "Cập nhật bài" : "Đăng bài"}
          </Button>
        </div>
      </div>
    </div>
  );
}
