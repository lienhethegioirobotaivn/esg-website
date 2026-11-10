"use client";

import { Languages, Loader2 } from "lucide-react";
import { useState } from "react";

import { Button, Card } from "@/components/ui";

import { pruneTranslations, warmTranslations } from "../lib/admin-api";

const LOCALES = [
  { code: "en", label: "Tiếng Anh" },
  { code: "fr", label: "Tiếng Pháp" },
  { code: "zh", label: "Tiếng Trung" },
] as const;

const MAX_ROUNDS = 40;

export function TranslationWarmup() {
  const [busy, setBusy] = useState(false);
  const [lines, setLines] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    if (busy) {
      return;
    }
    setBusy(true);
    setError(null);
    setLines([]);
    try {
      for (const locale of LOCALES) {
        let previous = Number.POSITIVE_INFINITY;
        for (let round = 0; round < MAX_ROUNDS; round += 1) {
          const result = await warmTranslations(locale.code);
          const done = result.total - result.remaining;
          setLines((current) => [
            ...current.filter((line) => !line.startsWith(`${locale.label}:`)),
            `${locale.label}: ${done}/${result.total} đoạn đã dịch`,
          ]);
          if (result.remaining === 0 || result.remaining >= previous) {
            break;
          }
          previous = result.remaining;
        }
      }
      const pruned = await pruneTranslations();
      setLines((current) => [
        ...current,
        `Dọn dẹp: đã xóa ${pruned.removed} dòng bản dịch không còn dùng, giữ ${pruned.keptManual} dòng có chữ sửa tay`,
      ]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không thể dịch sẵn nội dung.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="space-y-4 p-6">
      <div className="space-y-1">
        <h1 className="text-xl font-bold">Dịch sẵn nội dung</h1>
        <p className="text-sm text-muted">
          Dịch trước toàn bộ bộ câu hỏi, bài viết và số liệu sang tiếng Anh, Pháp, Trung để
          khách truy cập thấy đúng ngôn ngữ ngay. Chạy lại sau khi cập nhật nội dung; phần đã
          dịch sẽ được bỏ qua, các dòng bản dịch không còn dùng được dọn khỏi Sheet (dòng có chữ sửa
          tay luôn được giữ lại). Có thể mất vài phút, vui lòng giữ trang này mở.
        </p>
      </div>
      <Button
        disabled={busy}
        leadingIcon={
          busy ? (
            <Loader2 aria-hidden className="size-4 animate-spin" />
          ) : (
            <Languages aria-hidden className="size-4" />
          )
        }
        onClick={() => void run()}
      >
        {busy ? "Đang dịch..." : "Dịch sẵn nội dung"}
      </Button>
      {lines.length > 0 ? (
        <ul className="space-y-1 text-sm" aria-live="polite">
          {lines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      ) : null}
      {error ? (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      ) : null}
    </Card>
  );
}
