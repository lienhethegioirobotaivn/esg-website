"use client";

import type { PaletteColor, ReportTheme } from "@esg/shared";
import {
  REPORT_COVER_KINDS,
  REPORT_DENSITY_KINDS,
  REPORT_FONT_KINDS,
  REPORT_KPI_KINDS,
  REPORT_RADIUS_KINDS,
  REPORT_TABLE_HEAD_KINDS,
} from "@esg/shared";
import { RotateCcw } from "lucide-react";

import { Button, Field, Select } from "@/components/ui";
import { useT } from "@/features/locale";
import { msg } from "@/features/locale/lib/translate";

import type { BrandThemeDraft } from "../lib/theme-draft";
import { ThemePreview } from "./theme-preview";

const COVER_LABELS = {
  plain: msg("Trắng tối giản"),
  band: msg("Dải màu phía trên"),
  sidebar: msg("Thanh màu bên trái"),
  solid: msg("Nền màu toàn trang"),
} as const;

const FONT_LABELS = {
  sans: msg("Không chân (hiện đại)"),
  serif: msg("Có chân (trang trọng)"),
} as const;

const TABLE_HEAD_LABELS = {
  solid: msg("Nền màu"),
  underline: msg("Gạch chân"),
} as const;

const KPI_LABELS = {
  solid: msg("Nền màu"),
  outline: msg("Chỉ viền"),
} as const;

const RADIUS_LABELS = {
  square: msg("Vuông"),
  soft: msg("Bo nhẹ"),
  round: msg("Bo tròn"),
} as const;

const DENSITY_LABELS = {
  compact: msg("Gọn"),
  normal: msg("Cân đối"),
  airy: msg("Thoáng"),
} as const;

interface BrandThemeEditorProps {
  draft: BrandThemeDraft;
  theme: ReportTheme;
  palette: readonly PaletteColor[];
  onChange: (next: BrandThemeDraft) => void;
  onReset: () => void;
}

interface ColorFieldProps {
  id: string;
  label: string;
  value: string;
  palette: readonly PaletteColor[];
  onChange: (value: string) => void;
}

function ColorField({ id, label, value, palette, onChange }: ColorFieldProps) {
  const t = useT();
  return (
    <Field label={label} htmlFor={id}>
      <div className="flex flex-wrap items-center gap-2">
        <input
          id={id}
          type="color"
          value={value.toLowerCase()}
          onChange={(event) => onChange(event.target.value.toUpperCase())}
          className="h-10 w-14 cursor-pointer rounded-control border border-border bg-surface p-1"
        />
        <span className="font-mono text-xs text-muted">{value.toUpperCase()}</span>
        {palette.map((color) => (
          <button
            key={color.hex}
            type="button"
            onClick={() => onChange(color.hex)}
            aria-label={t("Chọn màu {color} từ ảnh", { color: color.hex })}
            title={color.hex}
            className="size-6 rounded-full border border-border-strong"
            style={{ background: color.hex }}
          />
        ))}
      </div>
    </Field>
  );
}

function toOptions<K extends string>(
  kinds: readonly K[],
  labels: Readonly<Record<K, string>>,
  t: (source: string) => string,
) {
  return kinds.map((kind) => ({ value: kind, label: t(labels[kind]) }));
}

export function BrandThemeEditor({
  draft,
  theme,
  palette,
  onChange,
  onReset,
}: BrandThemeEditorProps) {
  const t = useT();
  const tooLight =
    theme.colors.primary.toUpperCase() !== draft.primary.toUpperCase() ||
    theme.colors.accent.toUpperCase() !== draft.accent.toUpperCase();

  function setLayout(patch: Partial<BrandThemeDraft["layout"]>) {
    onChange({ ...draft, layout: { ...draft.layout, ...patch } });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-5 sm:flex-row">
        <ThemePreview theme={theme} />
        <div className="min-w-0 flex-1 space-y-3">
          <ColorField
            id="brand-primary"
            label={t("Màu chính")}
            value={draft.primary}
            palette={palette}
            onChange={(value) => onChange({ ...draft, primary: value })}
          />
          <ColorField
            id="brand-accent"
            label={t("Màu nhấn")}
            value={draft.accent}
            palette={palette}
            onChange={(value) => onChange({ ...draft, accent: value })}
          />
          {tooLight ? (
            <p className="text-xs text-subtle">
              {t("Màu quá sáng được làm đậm để chữ trắng vẫn dễ đọc.")}
            </p>
          ) : null}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t("Kiểu bìa")} htmlFor="brand-cover">
          <Select
            id="brand-cover"
            placeholder=""
            value={draft.layout.cover}
            options={toOptions(REPORT_COVER_KINDS, COVER_LABELS, t)}
            onChange={(event) =>
              setLayout({ cover: event.target.value as BrandThemeDraft["layout"]["cover"] })
            }
          />
        </Field>
        <Field label={t("Phông chữ")} htmlFor="brand-font">
          <Select
            id="brand-font"
            placeholder=""
            value={draft.font}
            options={toOptions(REPORT_FONT_KINDS, FONT_LABELS, t)}
            onChange={(event) =>
              onChange({ ...draft, font: event.target.value as BrandThemeDraft["font"] })
            }
          />
        </Field>
      </div>

      <details className="rounded-control border border-border">
        <summary className="cursor-pointer px-3 py-2 text-[0.8125rem] font-medium">
          {t("Tùy chỉnh thêm")}
        </summary>
        <div className="grid gap-3 border-t border-border p-3 sm:grid-cols-2">
          <Field label={t("Tiêu đề bảng")} htmlFor="brand-table-head">
            <Select
              id="brand-table-head"
              placeholder=""
              value={draft.layout.tableHead}
              options={toOptions(REPORT_TABLE_HEAD_KINDS, TABLE_HEAD_LABELS, t)}
              onChange={(event) =>
                setLayout({
                  tableHead: event.target.value as BrandThemeDraft["layout"]["tableHead"],
                })
              }
            />
          </Field>
          <Field label={t("Ô số liệu")} htmlFor="brand-kpi">
            <Select
              id="brand-kpi"
              placeholder=""
              value={draft.layout.kpi}
              options={toOptions(REPORT_KPI_KINDS, KPI_LABELS, t)}
              onChange={(event) =>
                setLayout({ kpi: event.target.value as BrandThemeDraft["layout"]["kpi"] })
              }
            />
          </Field>
          <Field label={t("Bo góc (chỉ có ở PDF)")} htmlFor="brand-radius">
            <Select
              id="brand-radius"
              placeholder=""
              value={draft.layout.radius}
              options={toOptions(REPORT_RADIUS_KINDS, RADIUS_LABELS, t)}
              onChange={(event) =>
                setLayout({ radius: event.target.value as BrandThemeDraft["layout"]["radius"] })
              }
            />
          </Field>
          <Field label={t("Độ dày nội dung")} htmlFor="brand-density">
            <Select
              id="brand-density"
              placeholder=""
              value={draft.layout.density}
              options={toOptions(REPORT_DENSITY_KINDS, DENSITY_LABELS, t)}
              onChange={(event) =>
                setLayout({
                  density: event.target.value as BrandThemeDraft["layout"]["density"],
                })
              }
            />
          </Field>
        </div>
      </details>

      <Button
        variant="ghost"
        size="sm"
        onClick={onReset}
        leadingIcon={<RotateCcw aria-hidden className="size-4" />}
      >
        {t("Dùng giao diện mặc định")}
      </Button>
    </div>
  );
}
