import { z } from "zod";

export interface ReportThemeColors {
  readonly primary: string;
  readonly accent: string;
  readonly ink: string;
  readonly muted: string;
  readonly panel: string;
  readonly panelSoft: string;
  readonly line: string;
}

export const REPORT_FONT_KINDS = ["sans", "serif"] as const;
export const REPORT_COVER_KINDS = ["plain", "band", "sidebar", "solid"] as const;
export const REPORT_TABLE_HEAD_KINDS = ["solid", "underline"] as const;
export const REPORT_KPI_KINDS = ["solid", "outline"] as const;
export const REPORT_RADIUS_KINDS = ["square", "soft", "round"] as const;
export const REPORT_DENSITY_KINDS = ["compact", "normal", "airy"] as const;

export type ReportFontKind = (typeof REPORT_FONT_KINDS)[number];
export type ReportCoverKind = (typeof REPORT_COVER_KINDS)[number];
export type ReportTableHeadKind = (typeof REPORT_TABLE_HEAD_KINDS)[number];
export type ReportKpiKind = (typeof REPORT_KPI_KINDS)[number];
export type ReportRadiusKind = (typeof REPORT_RADIUS_KINDS)[number];
export type ReportDensityKind = (typeof REPORT_DENSITY_KINDS)[number];

export interface ReportThemeLayout {
  readonly cover: ReportCoverKind;
  readonly tableHead: ReportTableHeadKind;
  readonly kpi: ReportKpiKind;
  readonly radius: ReportRadiusKind;
  readonly density: ReportDensityKind;
}

export interface ReportTheme {
  readonly isDefault: boolean;
  readonly colors: ReportThemeColors;
  readonly font: ReportFontKind;
  readonly layout: ReportThemeLayout;
}

export const DEFAULT_REPORT_LAYOUT: ReportThemeLayout = {
  cover: "plain",
  tableHead: "solid",
  kpi: "solid",
  radius: "square",
  density: "normal",
};

export const DEFAULT_REPORT_THEME: ReportTheme = {
  isDefault: true,
  font: "sans",
  layout: DEFAULT_REPORT_LAYOUT,
  colors: {
    primary: "#102642",
    accent: "#164CFF",
    ink: "#101820",
    muted: "#5B6677",
    panel: "#F1F5FB",
    panelSoft: "#F6F8FB",
    line: "#DDE3EE",
  },
};

const WHITE = "#FFFFFF";
const BLACK = "#000000";
const HEX_PATTERN = /^#?[0-9a-fA-F]{6}$/;

type Rgb = readonly [number, number, number];

function normalizeHex(value: string): string {
  return `#${value.trim().replace(/^#/, "").toUpperCase()}`;
}

const hexColor = z.string().trim().regex(HEX_PATTERN).transform(normalizeHex);

const layoutInputSchema = z.object({
  cover: z.enum(REPORT_COVER_KINDS).optional().catch(undefined),
  tableHead: z.enum(REPORT_TABLE_HEAD_KINDS).optional().catch(undefined),
  kpi: z.enum(REPORT_KPI_KINDS).optional().catch(undefined),
  radius: z.enum(REPORT_RADIUS_KINDS).optional().catch(undefined),
  density: z.enum(REPORT_DENSITY_KINDS).optional().catch(undefined),
});

export const reportThemeInputSchema = z.object({
  version: z.literal(1),
  font: z.enum(REPORT_FONT_KINDS).optional().catch(undefined),
  layout: layoutInputSchema.optional().catch(undefined),
  colors: z.object({
    primary: hexColor,
    accent: hexColor,
    ink: hexColor.optional(),
    muted: hexColor.optional(),
    panel: hexColor.optional(),
    panelSoft: hexColor.optional(),
    line: hexColor.optional(),
  }),
});

export type ReportThemeInput = z.input<typeof reportThemeInputSchema>;

function toRgb(hex: string): Rgb {
  const raw = hex.replace("#", "");
  return [
    parseInt(raw.slice(0, 2), 16),
    parseInt(raw.slice(2, 4), 16),
    parseInt(raw.slice(4, 6), 16),
  ];
}

function toHex(rgb: Rgb): string {
  const parts = rgb.map((value) =>
    Math.round(Math.min(255, Math.max(0, value)))
      .toString(16)
      .padStart(2, "0"),
  );
  return `#${parts.join("").toUpperCase()}`;
}

function mix(from: string, to: string, amount: number): string {
  const a = toRgb(from);
  const b = toRgb(to);
  return toHex([
    a[0] + (b[0] - a[0]) * amount,
    a[1] + (b[1] - a[1]) * amount,
    a[2] + (b[2] - a[2]) * amount,
  ]);
}

function channel(value: number): number {
  const scaled = value / 255;
  return scaled <= 0.03928 ? scaled / 12.92 : ((scaled + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number {
  const [r, g, b] = toRgb(hex);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrastRatio(first: string, second: string): number {
  const a = luminance(first);
  const b = luminance(second);
  const lighter = Math.max(a, b);
  const darker = Math.min(a, b);
  return (lighter + 0.05) / (darker + 0.05);
}

function darkenUntil(
  color: string,
  against: readonly string[],
  minimum: number,
): string {
  let current = color;
  for (let step = 0; step < 24; step += 1) {
    if (against.every((other) => contrastRatio(current, other) >= minimum)) {
      return current;
    }
    current = mix(current, BLACK, 0.08);
  }
  return current;
}

function lightOr(
  candidate: string | undefined,
  fallback: string,
  minimumLuminance: number,
): string {
  return candidate !== undefined && luminance(candidate) >= minimumLuminance
    ? candidate
    : fallback;
}

function sameTheme(first: Omit<ReportTheme, "isDefault">, second: Omit<ReportTheme, "isDefault">): boolean {
  return (
    first.font === second.font &&
    first.layout.cover === second.layout.cover &&
    first.layout.tableHead === second.layout.tableHead &&
    first.layout.kpi === second.layout.kpi &&
    first.layout.radius === second.layout.radius &&
    first.layout.density === second.layout.density &&
    first.colors.primary === second.colors.primary &&
    first.colors.accent === second.colors.accent &&
    first.colors.ink === second.colors.ink &&
    first.colors.muted === second.colors.muted &&
    first.colors.panel === second.colors.panel &&
    first.colors.panelSoft === second.colors.panelSoft &&
    first.colors.line === second.colors.line
  );
}

export function resolveReportTheme(input: unknown): ReportTheme {
  const parsed = reportThemeInputSchema.safeParse(input);
  if (!parsed.success) {
    return DEFAULT_REPORT_THEME;
  }
  const given = parsed.data.colors;

  const primary = darkenUntil(given.primary, [WHITE], 4.5);
  const ink = darkenUntil(given.ink ?? mix(primary, BLACK, 0.85), [WHITE], 7);
  const panel = lightOr(given.panel, mix(given.accent, WHITE, 0.93), 0.8);
  const panelSoft = lightOr(given.panelSoft, mix(given.accent, WHITE, 0.96), 0.8);
  const accent = darkenUntil(given.accent, [WHITE, panel], 4.5);
  const muted = darkenUntil(
    given.muted ?? mix(ink, WHITE, 0.62),
    [WHITE, panel],
    4.5,
  );
  const line = lightOr(given.line, mix(ink, WHITE, 0.87), 0.6);

  const colors: ReportThemeColors = {
    primary,
    accent,
    ink,
    muted,
    panel,
    panelSoft,
    line,
  };
  const font = parsed.data.font ?? DEFAULT_REPORT_THEME.font;
  const givenLayout = parsed.data.layout;
  const layout: ReportThemeLayout = {
    cover: givenLayout?.cover ?? DEFAULT_REPORT_LAYOUT.cover,
    tableHead: givenLayout?.tableHead ?? DEFAULT_REPORT_LAYOUT.tableHead,
    kpi: givenLayout?.kpi ?? DEFAULT_REPORT_LAYOUT.kpi,
    radius: givenLayout?.radius ?? DEFAULT_REPORT_LAYOUT.radius,
    density: givenLayout?.density ?? DEFAULT_REPORT_LAYOUT.density,
  };
  if (sameTheme({ colors, font, layout }, DEFAULT_REPORT_THEME)) {
    return DEFAULT_REPORT_THEME;
  }
  return { isDefault: false, colors, font, layout };
}
