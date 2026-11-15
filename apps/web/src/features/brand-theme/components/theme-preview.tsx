"use client";

import type { ReportTheme } from "@esg/shared";

import { useT } from "@/features/locale";

const RADIUS_PX = { square: 0, soft: 3, round: 8 } as const;
const SERIF = "Georgia, 'Times New Roman', serif";
const SANS = "Arial, Helvetica, sans-serif";

export function ThemePreview({ theme }: { theme: ReportTheme }) {
  const t = useT();
  const { colors, layout } = theme;
  const fontFamily = theme.font === "serif" ? SERIF : SANS;
  const onSolid = layout.cover === "solid";
  const radius = RADIUS_PX[layout.radius];
  const gap = layout.density === "compact" ? 3 : layout.density === "airy" ? 8 : 5;

  return (
    <div
      role="img"
      aria-label={t("Bản xem trước giao diện báo cáo")}
      className="flex shrink-0 items-start gap-3"
      style={{ fontFamily }}
    >
      <div className="relative h-40 w-28 overflow-hidden rounded-control border border-border bg-white shadow-sm">
        {layout.cover === "band" ? (
          <div className="absolute inset-x-0 top-0 h-12" style={{ background: colors.primary }} />
        ) : null}
        {layout.cover === "sidebar" ? (
          <div className="absolute inset-y-0 left-0 w-4" style={{ background: colors.primary }} />
        ) : null}
        {onSolid ? <div className="absolute inset-0" style={{ background: colors.primary }} /> : null}
        <div
          className="absolute inset-0 flex flex-col justify-end p-3"
          style={{ paddingLeft: layout.cover === "sidebar" ? 26 : 12 }}
        >
          <p
            className="text-[0.7rem] font-bold leading-tight"
            style={{ color: onSolid ? "#FFFFFF" : colors.ink }}
          >
            {t("BÁO CÁO ESG")}
          </p>
          <div
            className="mt-1.5 h-0.5 w-8"
            style={{ background: onSolid ? "#FFFFFF" : colors.accent }}
          />
          <div
            className="mt-2 h-1.5 w-16 rounded-sm"
            style={{ background: onSolid ? "rgba(255,255,255,0.6)" : colors.line }}
          />
        </div>
      </div>

      <div className="h-40 w-28 overflow-hidden rounded-control border border-border bg-white p-2 shadow-sm">
        <div className="mb-1 h-1.5 w-12 rounded-sm" style={{ background: colors.primary }} />
        <div className="flex" style={{ gap }}>
          {[0, 1].map((item) => (
            <div
              key={item}
              className="flex-1 p-1"
              style={{
                borderRadius: radius,
                background: layout.kpi === "solid" ? colors.panel : "#FFFFFF",
                border: layout.kpi === "outline" ? `1px solid ${colors.primary}` : "1px solid transparent",
              }}
            >
              <div className="h-2 w-4 rounded-sm" style={{ background: item === 0 ? colors.primary : colors.accent }} />
              <div className="mt-1 h-1 w-6 rounded-sm" style={{ background: colors.muted }} />
            </div>
          ))}
        </div>
        <div style={{ marginTop: gap + 2 }}>
          <div
            className="h-3"
            style={
              layout.tableHead === "solid"
                ? { background: colors.primary }
                : { borderBottom: `2px solid ${colors.primary}` }
            }
          />
          {[0, 1, 2].map((row) => (
            <div
              key={row}
              className="h-3"
              style={{ borderBottom: `1px solid ${colors.line}`, marginTop: gap > 5 ? 2 : 0 }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
