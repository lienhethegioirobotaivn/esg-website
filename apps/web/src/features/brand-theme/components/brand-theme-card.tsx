"use client";

import { LoaderCircle, Palette, Sparkles } from "lucide-react";

import { Button, Card } from "@/components/ui";
import { useT } from "@/features/locale";
import { msg } from "@/features/locale/lib/translate";

import type { BrandThemeState } from "../hooks/use-brand-theme";
import { BrandImagePicker } from "./brand-image-picker";
import { BrandThemeEditor } from "./brand-theme-editor";

const REASON_NOTES = {
  none: null,
  "no-consent": msg(
    "Bạn chưa đồng ý gửi ảnh cho AI nên hệ thống chỉ lấy màu từ ảnh ngay trên máy bạn.",
  ),
  "not-configured": msg("Máy chủ chưa bật phân tích bằng AI nên hệ thống chỉ lấy màu từ ảnh."),
  quota: msg("Đã hết lượt phân tích bằng AI, đang dùng bảng màu trích tự động từ ảnh."),
  error: msg("AI chưa phản hồi được, đang dùng bảng màu trích tự động từ ảnh."),
} as const;

export function BrandThemeCard({ brand }: { brand: BrandThemeState }) {
  const t = useT();
  const { result, theme } = brand;
  const note =
    result === null
      ? null
      : result.source === "ai"
        ? msg("AI đã đề xuất giao diện từ ảnh của bạn. Bạn có thể chỉnh lại bên dưới.")
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
                "Tải lên bộ nhận diện thương hiệu (logo, bảng màu, ấn phẩm). Hệ thống chọn màu, phông chữ và kiểu bìa cho báo cáo PDF và Word để hợp với thương hiệu của bạn.",
              )}
            </p>

            <BrandImagePicker
              files={brand.files}
              onAdd={brand.addFiles}
              onRemove={brand.removeFile}
              disabled={brand.isAnalyzing}
              error={brand.pickError}
            />

            <label className="flex items-start gap-3 rounded-control border border-border p-3.5 text-sm">
              <input
                type="checkbox"
                checked={brand.consent}
                disabled={brand.isAnalyzing}
                onChange={(event) => brand.setConsent(event.target.checked)}
                className="mt-0.5 size-4 shrink-0"
              />
              <span>
                <span className="font-medium">
                  {t("Tôi đồng ý gửi các ảnh này tới Google Gemini để phân tích.")}
                </span>
                <span className="mt-1 block text-xs leading-relaxed text-subtle">
                  {t(
                    "Ảnh chỉ dùng để phân tích và không được lưu trên máy chủ của chúng tôi. Google có thể dùng dữ liệu của gói miễn phí để cải tiến sản phẩm, vì vậy đừng gửi ảnh chứa thông tin mật. Nếu không đồng ý, hệ thống chỉ lấy màu từ ảnh ngay trên máy bạn.",
                  )}
                </span>
              </span>
            </label>

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
                {brand.isAnalyzing
                  ? t("Đang phân tích...")
                  : brand.consent
                    ? t("Phân tích bằng AI")
                    : t("Lấy màu từ ảnh")}
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
