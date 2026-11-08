"use client";

import { statsInputSchema } from "@esg/shared";
import { ArrowDown, ArrowUp, Loader2, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button, Card, IconButton, Input } from "@/components/ui";

import { AdminApiError, saveStats } from "../lib/admin-api";

interface StatsEditorProps {
  initial: { value: string; label: string }[];
}

const MAX_ITEMS = 8;

export function StatsEditor({ initial }: StatsEditorProps) {
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isRefreshing, startRefresh] = useTransition();
  const busy = isSaving || isRefreshing;

  function update(
    index: number,
    patch: Partial<{ value: string; label: string }>,
  ) {
    setItems((current) =>
      current.map((item, position) =>
        position === index ? { ...item, ...patch } : item,
      ),
    );
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= items.length) {
      return;
    }
    const next = [...items];
    const [item] = next.splice(index, 1);
    if (item) {
      next.splice(target, 0, item);
    }
    setItems(next);
  }

  async function handleSave() {
    if (isSaving) {
      return;
    }
    setError(null);
    setMessage(null);
    const parsed = statsInputSchema.safeParse({ items });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Dữ liệu chưa hợp lệ.");
      return;
    }
    setIsSaving(true);
    try {
      await saveStats(parsed.data.items);
      setMessage("Đã lưu số liệu.");
      startRefresh(() => router.refresh());
    } catch (caught) {
      setError(
        caught instanceof AdminApiError
          ? caught.message
          : "Không lưu được số liệu.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div>
      <Link href="/quan-tri" className="text-sm text-muted hover:underline">
        ← Danh sách bài viết
      </Link>
      <h1 className="mt-1 text-2xl text-primary-800">Số liệu thành tựu</h1>
      <p className="mt-2 text-sm text-muted">
        Hiển thị ở dải màu xanh đầu trang Thành tựu. Xóa hết số liệu và lưu thì
        dải này sẽ ẩn.
      </p>

      <Card className="mt-5 space-y-3 p-5">
        {items.length === 0 ? (
          <p className="text-sm text-muted">Chưa có số liệu nào.</p>
        ) : null}
        {items.map((item, index) => (
          <div
            key={index}
            className="grid gap-2 sm:grid-cols-[10rem_minmax(0,1fr)_auto] sm:items-center"
          >
            <Input
              aria-label={`Giá trị ${index + 1}`}
              value={item.value}
              onChange={(event) => update(index, { value: event.target.value })}
              placeholder="Ví dụ: 1.000"
            />
            <Input
              aria-label={`Nhãn ${index + 1}`}
              value={item.label}
              onChange={(event) => update(index, { label: event.target.value })}
              placeholder="Ví dụ: Doanh nghiệp sử dụng"
            />
            <div className="flex">
              <IconButton
                label="Chuyển lên"
                disabled={index === 0}
                onClick={() => move(index, -1)}
              >
                <ArrowUp aria-hidden className="size-4" />
              </IconButton>
              <IconButton
                label="Chuyển xuống"
                disabled={index === items.length - 1}
                onClick={() => move(index, 1)}
              >
                <ArrowDown aria-hidden className="size-4" />
              </IconButton>
              <IconButton
                label="Xóa số liệu"
                tone="danger"
                onClick={() =>
                  setItems((current) =>
                    current.filter((_, position) => position !== index),
                  )
                }
              >
                <Trash2 aria-hidden className="size-4" />
              </IconButton>
            </div>
          </div>
        ))}
        <Button
          variant="secondary"
          size="sm"
          disabled={items.length >= MAX_ITEMS}
          onClick={() =>
            setItems((current) => [...current, { value: "", label: "" }])
          }
          leadingIcon={<Plus aria-hidden className="size-4" />}
        >
          Thêm số liệu
        </Button>
      </Card>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <div aria-live="polite" className="text-sm">
          {error ? (
            <span role="alert" className="text-danger-600">
              {error}
            </span>
          ) : message ? (
            <span className="text-primary-700">{message}</span>
          ) : null}
        </div>
        <Button
          disabled={busy}
          onClick={() => void handleSave()}
          leadingIcon={
            busy ? (
              <Loader2 aria-hidden className="size-4 animate-spin" />
            ) : null
          }
        >
          {busy ? "Đang lưu..." : "Lưu số liệu"}
        </Button>
      </div>
    </div>
  );
}
