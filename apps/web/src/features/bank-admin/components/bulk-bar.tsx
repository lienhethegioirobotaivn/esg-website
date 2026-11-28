"use client";

import {
  BANK_REVIEW_LABELS,
  BANK_ROLLOUT_LABELS,
  type BankQuestionView,
} from "@esg/shared";
import { useState } from "react";

import { Button } from "@/components/ui";
import { controlClassName } from "@/components/ui/control-styles";
import { toOptions } from "@/features/backoffice/lib/labels";

import { TIER_LABELS } from "../lib/bank";

export type BulkPatch = Partial<
  Pick<
    BankQuestionView,
    "reviewStatus" | "declarationLevel" | "required" | "rolloutStatus"
  >
>;

interface Action {
  value: string;
  label: string;
  patch: BulkPatch;
}

const ACTION_GROUPS: readonly { label: string; actions: Action[] }[] = [
  {
    label: "Trạng thái duyệt",
    actions: toOptions(BANK_REVIEW_LABELS).map((option) => ({
      value: `review-${option.value}`,
      label: option.label,
      patch: { reviewStatus: option.value },
    })),
  },
  {
    label: "Mức khai báo",
    actions: toOptions(TIER_LABELS).map((option) => ({
      value: `tier-${option.value}`,
      label: option.label,
      patch: { declarationLevel: option.value },
    })),
  },
  {
    label: "Bắt buộc trả lời",
    actions: [
      { value: "required-yes", label: "Bắt buộc", patch: { required: true } },
      {
        value: "required-no",
        label: "Không bắt buộc",
        patch: { required: false },
      },
    ],
  },
  {
    label: "Tình trạng triển khai",
    actions: toOptions(BANK_ROLLOUT_LABELS).map((option) => ({
      value: `rollout-${option.value}`,
      label: option.label,
      patch: { rolloutStatus: option.value },
    })),
  },
];

export function BulkBar({
  count,
  busy,
  onApply,
  onDelete,
}: {
  count: number;
  busy: boolean;
  onApply: (patch: BulkPatch) => void;
  onDelete: () => void;
}) {
  const [value, setValue] = useState("");
  const action = ACTION_GROUPS.flatMap((group) => group.actions).find(
    (item) => item.value === value,
  );

  return (
    <div
      role="group"
      aria-label="Thao tác với câu đã chọn"
      className="space-y-2 rounded-card border border-primary-200 bg-primary-50 p-3"
    >
      <p className="text-sm font-semibold">Đã chọn {count} câu</p>
      <select
        aria-label="Đổi cho các câu đã chọn"
        className={controlClassName}
        value={value}
        onChange={(event) => setValue(event.target.value)}
      >
        <option value="">Chọn nội dung muốn đổi…</option>
        {ACTION_GROUPS.map((group) => (
          <optgroup key={group.label} label={group.label}>
            {group.actions.map((item) => (
              <option key={item.value} value={item.value}>
                {group.label}: {item.label}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      <div className="flex flex-wrap justify-between gap-2">
        <Button
          size="sm"
          loading={busy}
          disabled={action === undefined}
          onClick={() => {
            if (action) {
              onApply(action.patch);
              setValue("");
            }
          }}
        >
          Áp dụng
        </Button>
        <Button
          variant="secondary"
          size="sm"
          disabled={busy}
          onClick={onDelete}
        >
          Xóa {count} câu
        </Button>
      </div>
    </div>
  );
}
