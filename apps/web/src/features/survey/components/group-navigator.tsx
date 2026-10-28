import { ArrowLeft, ArrowRight } from "lucide-react";

import { Button } from "@/components/ui";

interface GroupNavigatorProps {
  position: number;
  total: number;
  hasPrevious: boolean;
  hasNext: boolean;
  onPrevious: () => void;
  onNext: () => void;
}

export function GroupNavigator({
  position,
  total,
  hasPrevious,
  hasNext,
  onPrevious,
  onNext,
}: GroupNavigatorProps) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-border px-6 py-4 sm:px-8">
      <Button
        variant="ghost"
        onClick={onPrevious}
        disabled={!hasPrevious}
        leadingIcon={<ArrowLeft aria-hidden className="size-4" />}
      >
        Nhóm trước
      </Button>
      <p className="text-sm text-subtle">
        Nhóm {position} trên {total}
      </p>
      <Button
        onClick={onNext}
        disabled={!hasNext}
        trailingIcon={<ArrowRight aria-hidden className="size-4" />}
      >
        Nhóm tiếp
      </Button>
    </div>
  );
}
