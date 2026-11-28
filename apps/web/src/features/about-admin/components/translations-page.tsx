"use client";

import { Pencil } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui";
import { Badge } from "@/features/backoffice/components/badge";
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
import {
  LoadError,
  Loading,
  Notice,
} from "@/features/backoffice/components/states";
import { withQuery } from "@/features/backoffice/lib/api";
import type { Tone } from "@/features/backoffice/lib/labels";
import {
  PAGE_SIZE,
  useQueryState,
} from "@/features/backoffice/lib/use-query-state";
import { useResource } from "@/features/backoffice/lib/use-resource";

import {
  TRANSLATION_LOCALE_LABELS,
  type TranslationItem,
  type TranslationList,
  type TranslationLocale,
} from "../lib/translations";
import { TranslationActions } from "./translation-actions";
import { TranslationDialog } from "./translation-dialog";

const STATUS: Readonly<
  Record<TranslationItem["status"], { label: string; tone: Tone }>
> = {
  manual: { label: "Sửa tay", tone: "green" },
  glossary: { label: "Bảng thuật ngữ", tone: "blue" },
  auto: { label: "Dịch máy", tone: "gray" },
  missing: { label: "Chưa dịch", tone: "amber" },
};

const STATUS_FILTERS = [
  { value: "missing", label: "Chưa dịch" },
  { value: "auto", label: "Dịch máy" },
  { value: "manual", label: "Sửa tay" },
];

const LOCALE_OPTIONS = [
  { value: "fr", label: "Tiếng Pháp" },
  { value: "zh", label: "Tiếng Trung" },
];

function isLocale(value: string): value is TranslationLocale {
  return value in TRANSLATION_LOCALE_LABELS;
}

export function TranslationsPage() {
  const query = useQueryState();
  const [editing, setEditing] = useState<TranslationItem | null>(null);
  const requested = query.get("locale");
  const locale: TranslationLocale = isLocale(requested) ? requested : "en";
  const status = query.get("status");
  const q = query.get("q");
  const list = useResource<TranslationList>(
    withQuery("/admin/translations", {
      locale,
      status,
      q,
      limit: PAGE_SIZE,
      offset: query.offset,
    }),
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title="Bản dịch"
        description="Nội dung tiếng Việt được máy dịch sang Anh, Pháp, Trung. Bạn có thể sửa tay từng đoạn."
      />
      {list.data && !list.data.configured ? (
        <Notice tone="warning">
          Máy chủ chưa có khóa dịch (<code>GEMINI_API_KEY</code> trong{" "}
          <code>apps/api/.env</code>), nên chỉ sửa tay được.
        </Notice>
      ) : null}
      <TranslationActions
        configured={list.data?.configured ?? false}
        onChanged={list.reload}
      />
      <FilterBar active={query.active} onClear={query.clear}>
        <SearchBox
          value={q}
          placeholder="Tìm trong chữ nguồn hoặc bản dịch"
          onChange={(value) => query.set({ q: value })}
        />
        <FilterSelect
          label="Ngôn ngữ"
          value={locale === "en" ? "" : locale}
          allLabel="Tiếng Anh"
          options={LOCALE_OPTIONS}
          onChange={(value) => query.set({ locale: value })}
        />
        <FilterSelect
          label="Tình trạng"
          value={status}
          options={STATUS_FILTERS}
          onChange={(value) => query.set({ status: value })}
        />
      </FilterBar>
      {list.error ? (
        <LoadError error={list.error} onRetry={list.reload} />
      ) : null}
      {list.data ? (
        <>
          <DataTable
            label="Danh sách bản dịch"
            rows={list.data.items}
            rowKey={(item) => item.sourceHash}
            busy={list.loading}
            empty={
              status || q
                ? "Không có đoạn nào khớp bộ lọc."
                : "Chưa có đoạn nào. Bấm “Dịch phần còn thiếu” để thu thập nội dung."
            }
            columns={[
              {
                header: "Tiếng Việt",
                className: "w-2/5",
                cell: (item) => (
                  <p className="line-clamp-4 break-words">{item.sourceText}</p>
                ),
              },
              {
                header: "Bản dịch đang dùng",
                className: "w-2/5",
                cell: (item) => (
                  <p lang={locale} className="line-clamp-4 break-words">
                    {item.manualText ?? item.glossaryText ?? item.autoText}
                  </p>
                ),
              },
              {
                header: "Tình trạng",
                cell: (item) => (
                  <div className="space-y-1">
                    <Badge tone={STATUS[item.status].tone}>
                      {STATUS[item.status].label}
                    </Badge>
                    {item.status === "missing" && item.failedAttempts > 0 ? (
                      <div className="text-xs text-danger-600">
                        Lỗi {item.failedAttempts} lần
                      </div>
                    ) : null}
                  </div>
                ),
              },
              {
                header: <span className="sr-only">Thao tác</span>,
                className: "text-right",
                cell: (item) => (
                  <Button
                    variant="secondary"
                    size="sm"
                    leadingIcon={<Pencil aria-hidden className="size-3.5" />}
                    onClick={() => setEditing(item)}
                  >
                    Sửa
                  </Button>
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
      {editing ? (
        <TranslationDialog
          item={editing}
          locale={locale}
          localeLabel={TRANSLATION_LOCALE_LABELS[locale]}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            list.reload();
          }}
        />
      ) : null}
    </div>
  );
}
