"use client";

import {
  BANK_REVIEW_LABELS,
  BANK_ROLLOUT_LABELS,
  BANK_SOURCE_LABELS,
  type BankDetail,
  type BankQuestionView,
  type BankSource,
} from "@esg/shared";
import { ArrowDown, ArrowUp, Plus, X } from "lucide-react";
import { Fragment, useState } from "react";

import { Button, Card, IconButton } from "@/components/ui";
import { Badge } from "@/features/backoffice/components/badge";
import { Choice } from "@/features/backoffice/components/choice";
import {
  FilterSelect,
  SearchBox,
} from "@/features/backoffice/components/filters";
import { toOptions } from "@/features/backoffice/lib/labels";
import { cn } from "@/lib/cn";

import {
  NO_FILTERS,
  REVIEW_TONES,
  TIER_LABELS,
  isBankSource,
  isFiltering,
  ofSource,
  sourceOptions,
  visibleQuestions,
  type QuestionFilters,
} from "../lib/bank";
import { BulkBar, type BulkPatch } from "./bulk-bar";

interface QuestionListProps {
  detail: BankDetail;
  source: BankSource;
  filters: QuestionFilters;
  selectedId: string | null;
  readOnly: boolean;
  busy: boolean;
  onSource: (source: BankSource) => void;
  onFilters: (patch: Partial<QuestionFilters>) => void;
  onSelect: (question: BankQuestionView) => void;
  onAdd: () => void;
  onStep: (question: BankQuestionView, step: -1 | 1) => void;
  onBulk: (ids: string[], patch: BulkPatch) => void;
  onDelete: (questions: BankQuestionView[]) => void;
}

export function QuestionList({
  detail,
  source,
  filters,
  selectedId,
  readOnly,
  busy,
  onSource,
  onFilters,
  onSelect,
  onAdd,
  onStep,
  onBulk,
  onDelete,
}: QuestionListProps) {
  const [checked, setChecked] = useState<ReadonlySet<string>>(new Set());
  const filtering = isFiltering(filters);
  const visible = visibleQuestions(detail.questions, source, filters);
  const chosen = visible.filter((question) => checked.has(question.id));
  const inSource = ofSource(detail.questions, source);
  const approved = inSource.filter(
    (question) => question.reviewStatus === "approved",
  ).length;

  function heading(question: BankQuestionView): string {
    if (filtering) {
      return BANK_SOURCE_LABELS[question.source];
    }
    return (
      detail.groups.find((group) => group.code === question.groupCode)?.title ??
      question.groupCode
    );
  }

  function toggle(id: string, value: boolean) {
    const next = new Set(checked);
    if (value) {
      next.add(id);
    } else {
      next.delete(id);
    }
    setChecked(next);
  }

  return (
    <div className="space-y-3">
      <Card className="space-y-3 p-3">
        <div className="space-y-1">
          <label htmlFor="bank-source" className="block text-xs font-semibold">
            Tab câu hỏi
          </label>
          <Choice
            id="bank-source"
            value={source}
            options={sourceOptions(detail.questions)}
            onChange={(event) => {
              if (isBankSource(event.target.value)) {
                onSource(event.target.value);
              }
            }}
          />
          <p className="text-xs text-muted">
            {approved}/{inSource.length} câu trong tab đã duyệt
          </p>
        </div>
        <SearchBox
          value={filters.search}
          placeholder="Mã câu, nội dung, chủ đề"
          onChange={(search) => onFilters({ search })}
        />
        <div className="grid grid-cols-2 gap-2">
          <FilterSelect
            label="Duyệt"
            className="min-w-0"
            value={filters.review}
            options={toOptions(BANK_REVIEW_LABELS)}
            onChange={(review) => onFilters({ review })}
          />
          <FilterSelect
            label="Mức khai báo"
            className="min-w-0"
            value={filters.tier}
            options={toOptions(TIER_LABELS)}
            onChange={(tier) => onFilters({ tier })}
          />
          <FilterSelect
            label="Triển khai"
            className="col-span-2 min-w-0"
            value={filters.rollout}
            options={toOptions(BANK_ROLLOUT_LABELS)}
            onChange={(rollout) => onFilters({ rollout })}
          />
        </div>
        {filtering ? (
          <div className="flex items-center justify-between gap-2">
            <p aria-live="polite" className="text-xs text-muted">
              Tìm thấy {visible.length} câu trong tất cả các tab
            </p>
            <Button
              variant="ghost"
              size="sm"
              leadingIcon={<X aria-hidden className="size-4" />}
              onClick={() => onFilters(NO_FILTERS)}
            >
              Xóa lọc
            </Button>
          </div>
        ) : null}
        {readOnly ? null : (
          <Button
            variant="secondary"
            className="w-full"
            leadingIcon={<Plus aria-hidden className="size-4" />}
            onClick={onAdd}
          >
            Thêm câu hỏi
          </Button>
        )}
      </Card>
      {!readOnly && chosen.length > 0 ? (
        <BulkBar
          count={chosen.length}
          busy={busy}
          onApply={(patch) =>
            onBulk(
              chosen.map((question) => question.id),
              patch,
            )
          }
          onDelete={() => onDelete(chosen)}
        />
      ) : null}
      <Card className="overflow-hidden">
        {!readOnly && visible.length > 0 ? (
          <label className="flex items-center gap-2.5 border-b border-border px-3 py-2 text-xs font-semibold">
            <input
              type="checkbox"
              className="size-4 accent-primary-700"
              checked={chosen.length === visible.length}
              onChange={(event) =>
                setChecked(
                  event.target.checked
                    ? new Set(visible.map((question) => question.id))
                    : new Set(),
                )
              }
            />
            Chọn tất cả {visible.length} câu đang hiện
          </label>
        ) : null}
        {visible.length === 0 ? (
          <p className="p-4 text-sm text-muted">
            {filtering
              ? "Không có câu nào khớp bộ lọc."
              : "Tab này chưa có câu hỏi."}
          </p>
        ) : (
          <ul className="lg:max-h-[70vh] lg:overflow-y-auto">
            {visible.map((question, index) => {
              const title = heading(question);
              const previous = visible[index - 1];
              const showHeading =
                previous === undefined || heading(previous) !== title;
              return (
                <Fragment key={question.id}>
                  {showHeading ? (
                    <li className="border-b border-border bg-surface-muted px-3 py-1.5 text-xs font-semibold text-muted">
                      {title}
                    </li>
                  ) : null}
                  <li
                    className={cn(
                      "flex items-start gap-2.5 border-b border-border px-3 py-2.5",
                      question.id === selectedId && "bg-primary-50",
                    )}
                  >
                    {readOnly ? null : (
                      <input
                        type="checkbox"
                        aria-label={`Chọn câu ${question.code}`}
                        className="mt-0.5 size-4 shrink-0 accent-primary-700"
                        checked={checked.has(question.id)}
                        onChange={(event) =>
                          toggle(question.id, event.target.checked)
                        }
                      />
                    )}
                    <button
                      type="button"
                      aria-current={
                        question.id === selectedId ? "true" : undefined
                      }
                      className="min-w-0 flex-1 space-y-1 text-left"
                      onClick={() => onSelect(question)}
                    >
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-primary-800">
                          {question.code}
                        </span>
                        <Badge tone={REVIEW_TONES[question.reviewStatus]}>
                          {BANK_REVIEW_LABELS[question.reviewStatus]}
                        </Badge>
                        {question.declarationLevel === "extended" ? (
                          <Badge tone="blue">Mở rộng</Badge>
                        ) : null}
                      </span>
                      <span className="line-clamp-2 text-sm">
                        {question.text}
                      </span>
                    </button>
                    {readOnly || filtering ? null : (
                      <span className="flex shrink-0 flex-col">
                        <IconButton
                          label={`Đưa câu ${question.code} lên`}
                          disabled={busy || index === 0}
                          className="size-6"
                          onClick={() => onStep(question, -1)}
                        >
                          <ArrowUp aria-hidden className="size-3.5" />
                        </IconButton>
                        <IconButton
                          label={`Đưa câu ${question.code} xuống`}
                          disabled={busy || index === visible.length - 1}
                          className="size-6"
                          onClick={() => onStep(question, 1)}
                        >
                          <ArrowDown aria-hidden className="size-3.5" />
                        </IconButton>
                      </span>
                    )}
                  </li>
                </Fragment>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
