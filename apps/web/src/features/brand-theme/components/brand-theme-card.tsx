"use client";

import { LoaderCircle, Palette, Sparkles } from "lucide-react";

import { Button, Card } from "@/components/ui";
import { useT } from "@/features/locale";
import { msg } from "@/features/locale/lib/translate";

import type { BrandThemeState } from "../hooks/use-brand-theme";
import { BrandImagePicker } from "./brand-image-picker";
import { BrandThemeEditor } from "./brand-theme-editor";

const BASIC_NOTE = msg("Đã tạo giao diện cơ bản từ màu trong ảnh của bạn. Bạn có thể chỉnh lại bên dưới.");

const REASON_NOTES = {
  none: null,
  "no-consent": BASIC_NOTE,
  "not-configured": BASIC_NOTE,
  quota: BASIC_NOTE,
  error: BASIC_NOTE,
} as const;

export function BrandThemeCard({ brand }: { brand: BrandThemeState }) {
  const t = useT();
  const { result, theme } = brand;
  const note =
    result === null
      ? null
      : result.source === "ai"
        ? msg("Đã thiết kế giao diện báo cáo từ ảnh của bạn. Bạn có thể chỉnh lại bên dưới.")
        : result.palette.length === 0
          ? msg("Không đọc được màu từ ảnh. Hãy chọn ảnh có logo hoặc bảng màu rõ ràng.")
          : REASON_NOTES[result.reason];

  return (
    <div className="mt-6">
      <Card>
        <details>
          <summary className="flex cursor-pointer flex-wrap items-center gap-x-2 px-5 py-3 text-base font-semibold">
            <Palette aria-hidden className="size-4" />
            {t("Giao diện báo cáo theo thương hiệu (tùy chọn)")}
            <span className="text-[0.8125rem] font-normal text-muted">
              {theme.isDefault ? t("Giao diện: mặc định") : t("Giao diện: thương hiệu")}
            </span>
          </summary>

          <div className="space-y-5 border-t border-border px-5 py-4">
            <p className="text-[0.8125rem] leading-relaxed text-muted">
              {t(
                "Tải lên ảnh logo, bảng màu hoặc ấn phẩm của doanh nghiệp. Hệ thống sẽ thiết kế màu sắc, phông chữ và kiểu bìa cho báo cáo PDF và Word dựa trên các ảnh bạn đã tải.",
              )}
            </p>

            <BrandImagePicker
              files={brand.files}
              onAdd={brand.addFiles}
              onRemove={brand.removeFile}
              disabled={brand.isAnalyzing}
              error={brand.pickError}
            />

            <div className="flex flex-wrap items-center gap-3">
              <Button
                onClick={() => void brand.analyze()}
                disabled={brand.isAnalyzing || brand.files.length === 0}
                leadingIcon={
                  brand.isAnalyzing ? (
                    <LoaderCircle aria-hidden className="size-4 animate-spin" />
                  ) : (
                    <Sparkles aria-hidden className="size-4" />
                  )
                }
              >
                {brand.isAnalyzing ? t("Đang thiết kế...") : t("Thiết kế báo cáo từ ảnh")}
              </Button>
              <p className="text-xs text-subtle">
                {t("Ảnh không được lưu: tải lại trang thì cần chọn lại ảnh, giao diện đã chọn vẫn được giữ.")}
              </p>
            </div>

            <div aria-live="polite">
              {brand.error ? (
                <div role="alert" className="flex flex-wrap items-center gap-3 text-sm text-danger-600">
                  <span>{brand.error}</span>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={brand.isAnalyzing}
                    onClick={() => void brand.analyze()}
                  >
                    {t("Thử lại")}
                  </Button>
                </div>
              ) : null}
              {note !== null ? (
                <p role="status" className="rounded-card border border-primary-200 bg-primary-50 px-4 py-3 text-sm text-primary-900">
                  {t(note)}
                </p>
              ) : null}
            </div>

            <BrandThemeEditor
              draft={brand.draft}
              theme={theme}
              palette={result?.palette ?? []}
              onChange={brand.changeDraft}
              onReset={brand.resetTheme}
            />
          </div>
        </details>
      </Card>
    </div>
  );
}
