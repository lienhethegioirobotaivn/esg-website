import { ArrowLeft, ArrowRight } from "lucide-react";

import { Button } from "@/components/ui";
import { useT } from "@/features/locale";

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
  const t = useT();
  return (
    <div className="flex items-center justify-between gap-3 border-t border-border px-5 py-3">
      <Button
        variant="secondary"
        onClick={onPrevious}
        disabled={!hasPrevious}
        leadingIcon={<ArrowLeft aria-hidden className="size-4" />}
      >
        {t("Nhóm trước")}
      </Button>
      <p className="text-sm text-subtle">
        {t("Nhóm {position} trên {total}", { position, total })}
      </p>
      <Button
        onClick={onNext}
        disabled={!hasNext}
        trailingIcon={<ArrowRight aria-hidden className="size-4" />}
      >
        {t("Nhóm tiếp")}
      </Button>
    </div>
  );
}