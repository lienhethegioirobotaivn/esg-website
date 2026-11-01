import { ArrowLeft, ArrowRight, Save } from "lucide-react";

import { Button } from "@/components/ui";

interface GroupFooterProps {
  position: number;
  total: number;
  hasPrevious: boolean;
  hasNext: boolean;
  isDirty: boolean;
  saveFailed: boolean;
  onPrevious: () => void;
  onSaveAndContinue: () => void;
}

export function GroupFooter({
  position,
  total,
  hasPrevious,
  hasNext,
  isDirty,
  saveFailed,
  onPrevious,
  onSaveAndContinue,
}: GroupFooterProps) {
  return (
    <div className="flex flex-col gap-3 border-t border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <Button
          variant="secondary"
          onClick={onPrevious}
          disabled={!hasPrevious}
          leadingIcon={<ArrowLeft aria-hidden className="size-4" />}
        >
          Nhóm trước
        </Button>
        <div className="min-w-0 text-xs text-subtle">
          <p>
            Nhóm {position} trên {total}
          </p>
          <p className={saveFailed ? "text-danger-600" : undefined}>
            {saveFailed
              ? "Không lưu được vào trình duyệt này"
              : isDirty
                ? "Có thay đổi chưa lưu"
                : "Tự động lưu sau mỗi nhóm"}
          </p>
        </div>
      </div>
      <Button
        onClick={onSaveAndContinue}
        className="sm:shrink-0"
        leadingIcon={
          hasNext ? undefined : <Save aria-hidden className="size-4" />
        }
        trailingIcon={
          hasNext ? <ArrowRight aria-hidden className="size-4" /> : undefined
        }
      >
        {hasNext ? "Lưu & tiếp tục" : "Lưu bản nháp"}
      </Button>
    </div>
  );
}
