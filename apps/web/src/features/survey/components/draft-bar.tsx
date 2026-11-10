import { Save } from "lucide-react";

import { Button } from "@/components/ui";
import { useLocale, useT } from "@/features/locale";
import type { Locale, TFunction } from "@/features/locale";

import { formatSavedAt } from "../lib/format-saved-at";

interface DraftBarProps {
  savedAt: string | null;
  isDirty: boolean;
  saveFailed: boolean;
  onSave: () => void;
}

function getStatus(props: DraftBarProps, t: TFunction, locale: Locale): string {
  if (props.saveFailed) {
    return t(
      "Không lưu được vào trình duyệt này. Vui lòng kiểm tra chế độ riêng tư hoặc dung lượng lưu trữ.",
    );
  }
  if (props.isDirty) {
    return t("Có thay đổi chưa được lưu");
  }
  if (props.savedAt !== null) {
    return t("Đã lưu bản nháp lúc {time}", {
      time: formatSavedAt(props.savedAt, locale),
    });
  }
  return t("Chưa có bản nháp");
}

export function DraftBar(props: DraftBarProps) {
  const { isDirty, saveFailed, onSave } = props;
  const t = useT();
  const locale = useLocale();
  return (
    <div className="border-t border-border px-5 py-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p
            role="status"
            className={
              saveFailed
                ? "text-sm font-medium text-danger-600"
                : "text-sm font-medium"
            }
          >
            {getStatus(props, t, locale)}
          </p>
          <p className="mt-0.5 text-xs text-subtle">
            {t(
              "Bản nháp tự lưu khi bạn trả lời xong một nhóm. Tệp bằng chứng chưa được lưu trong bản nháp.",
            )}
          </p>
        </div>
        <Button
          variant="secondary"
          leadingIcon={<Save aria-hidden className="size-4" />}
          onClick={onSave}
          disabled={!isDirty && !saveFailed}
          className="shrink-0"
        >
          {t("Lưu bản nháp")}
        </Button>
      </div>
    </div>
  );
}
