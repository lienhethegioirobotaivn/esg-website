import { z } from "zod";

import {
  REPORT_COVER_KINDS,
  REPORT_DENSITY_KINDS,
  REPORT_FONT_KINDS,
  REPORT_KPI_KINDS,
  REPORT_RADIUS_KINDS,
  REPORT_TABLE_HEAD_KINDS,
  reportThemeInputSchema,
} from "./report-theme";
import type { ReportThemeInput } from "./report-theme";

export const BRAND_IMAGE_MIME_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;

export type BrandImageMimeType = (typeof BRAND_IMAGE_MIME_TYPES)[number];

export const BRAND_IMAGE_LIMITS = {
  maxImages: 6,
  maxSourceBytes: 5 * 1024 * 1024,
  maxPreparedBytes: 1_200_000,
  maxTotalPreparedBytes: 3_600_000,
  maxSide: 1024,
  maxPaletteColors: 8,
} as const;

export interface PaletteColor {
  readonly hex: string;
  readonly share: number;
}

const HEX_PATTERN = /^#?[0-9a-fA-F]{6}$/;

function normalizeColor(value: string): string {
  return `#${value.trim().replace(/^#/, "").toUpperCase()}`;
}

const colorString = z.string().trim().regex(HEX_PATTERN).transform(normalizeColor);

export const brandPaletteSchema = z
  .array(z.object({ hex: colorString, share: z.number().min(0).max(1) }))
  .max(16);

export const brandSuggestionSchema = z.object({
  primary: colorString,
  accent: colorString,
  font: z.enum(REPORT_FONT_KINDS).catch("sans"),
  cover: z.enum(REPORT_COVER_KINDS).catch("plain"),
  tableHead: z.enum(REPORT_TABLE_HEAD_KINDS).catch("solid"),
  kpi: z.enum(REPORT_KPI_KINDS).catch("solid"),
  radius: z.enum(REPORT_RADIUS_KINDS).catch("square"),
  density: z.enum(REPORT_DENSITY_KINDS).catch("normal"),
});

export type BrandSuggestion = z.output<typeof brandSuggestionSchema>;

export const BRAND_THEME_SOURCES = ["ai", "palette"] as const;
export const BRAND_THEME_REASONS = [
  "none",
  "no-consent",
  "not-configured",
  "quota",
  "error",
] as const;

export const brandThemeResultSchema = z.object({
  source: z.enum(BRAND_THEME_SOURCES),
  reason: z.enum(BRAND_THEME_REASONS),
  theme: reportThemeInputSchema,
  palette: brandPaletteSchema,
});

export type BrandThemeResult = z.output<typeof brandThemeResultSchema>;

const BUCKET_SHIFT = 4;
const BUCKET_LEVELS = 1 << (8 - BUCKET_SHIFT);
const MERGE_DISTANCE = 48;
const DISTINCT_DISTANCE = 60;
const PAPER_WHITE_MIN = 238;
const MIN_SHARE = 0.01;
const MIN_ALPHA = 128;

interface Cluster {
  r: number;
  g: number;
  b: number;
  weight: number;
}

type Rgb = readonly [number, number, number];

function toRgb(hex: string): Rgb {
  const raw = hex.replace("#", "");
  return [
    parseInt(raw.slice(0, 2), 16),
    parseInt(raw.slice(2, 4), 16),
    parseInt(raw.slice(4, 6), 16),
  ];
}

function toHex(r: number, g: number, b: number): string {
  const parts = [r, g, b].map((value) =>
    Math.round(Math.min(255, Math.max(0, value)))
      .toString(16)
      .padStart(2, "0"),
  );
  return `#${parts.join("").toUpperCase()}`;
}

function distance(a: Rgb, b: Rgb): number {
  return Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2);
}

function hexDistance(first: string, second: string): number {
  return distance(toRgb(first), toRgb(second));
}

function saturationOf(hex: string): number {
  const [r, g, b] = toRgb(hex).map((value) => value / 255) as [number, number, number];
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const lightness = (max + min) / 2;
  if (max === min) {
    return 0;
  }
  return (max - min) / (1 - Math.abs(2 * lightness - 1));
}

function lightnessOf(hex: string): number {
  const [r, g, b] = toRgb(hex);
  return (Math.max(r, g, b) + Math.min(r, g, b)) / 510;
}

function addToClusters(
  clusters: Cluster[],
  r: number,
  g: number,
  b: number,
  weight: number,
): void {
  let bestIndex = -1;
  let bestDistance = MERGE_DISTANCE;
  clusters.forEach((cluster, index) => {
    const gap = distance([cluster.r, cluster.g, cluster.b], [r, g, b]);
    if (gap < bestDistance) {
      bestDistance = gap;
      bestIndex = index;
    }
  });
  const target = bestIndex >= 0 ? clusters[bestIndex] : undefined;
  if (target === undefined) {
    clusters.push({ r, g, b, weight });
    return;
  }
  const total = target.weight + weight;
  target.r = (target.r * target.weight + r * weight) / total;
  target.g = (target.g * target.weight + g * weight) / total;
  target.b = (target.b * target.weight + b * weight) / total;
  target.weight = total;
}

function finalizeClusters(
  clusters: readonly Cluster[],
  totalWeight: number,
  maxColors: number,
): PaletteColor[] {
  if (totalWeight <= 0) {
    return [];
  }
  return [...clusters]
    .sort((a, b) => b.weight - a.weight)
    .map((cluster) => ({
      hex: toHex(cluster.r, cluster.g, cluster.b),
      share: Math.round((cluster.weight / totalWeight) * 10000) / 10000,
    }))
    .filter((color) => color.share >= MIN_SHARE)
    .slice(0, maxColors);
}

export function paletteFromPixels(
  rgba: ArrayLike<number>,
  maxColors: number = BRAND_IMAGE_LIMITS.maxPaletteColors,
): PaletteColor[] {
  const size = BUCKET_LEVELS ** 3;
  const counts = new Float64Array(size);
  const sumR = new Float64Array(size);
  const sumG = new Float64Array(size);
  const sumB = new Float64Array(size);
  let counted = 0;

  for (let index = 0; index + 3 < rgba.length; index += 4) {
    const alpha = rgba[index + 3] ?? 0;
    if (alpha < MIN_ALPHA) {
      continue;
    }
    const r = rgba[index] ?? 0;
    const g = rgba[index + 1] ?? 0;
    const b = rgba[index + 2] ?? 0;
    if (Math.min(r, g, b) >= PAPER_WHITE_MIN) {
      continue;
    }
    const key =
      ((r >> BUCKET_SHIFT) * BUCKET_LEVELS + (g >> BUCKET_SHIFT)) * BUCKET_LEVELS +
      (b >> BUCKET_SHIFT);
    counts[key] = (counts[key] ?? 0) + 1;
    sumR[key] = (sumR[key] ?? 0) + r;
    sumG[key] = (sumG[key] ?? 0) + g;
    sumB[key] = (sumB[key] ?? 0) + b;
    counted += 1;
  }

  const buckets: Cluster[] = [];
  for (let key = 0; key < size; key += 1) {
    const count = counts[key] ?? 0;
    if (count > 0) {
      buckets.push({
        r: (sumR[key] ?? 0) / count,
        g: (sumG[key] ?? 0) / count,
        b: (sumB[key] ?? 0) / count,
        weight: count,
      });
    }
  }
  buckets.sort((a, b) => b.weight - a.weight);

  const clusters: Cluster[] = [];
  for (const bucket of buckets) {
    addToClusters(clusters, bucket.r, bucket.g, bucket.b, bucket.weight);
  }
  return finalizeClusters(clusters, counted, maxColors);
}

export function mergePalettes(
  palettes: readonly (readonly PaletteColor[])[],
  maxColors: number = BRAND_IMAGE_LIMITS.maxPaletteColors,
): PaletteColor[] {
  const filled = palettes.filter((palette) => palette.length > 0);
  const entries = filled
    .flatMap((palette) => palette.map((color) => ({ rgb: toRgb(color.hex), weight: color.share })))
    .sort((a, b) => b.weight - a.weight);
  const clusters: Cluster[] = [];
  for (const entry of entries) {
    addToClusters(clusters, entry.rgb[0], entry.rgb[1], entry.rgb[2], entry.weight);
  }
  return finalizeClusters(clusters, filled.length, maxColors);
}

export function nearestPaletteColor(
  hex: string,
  palette: readonly PaletteColor[],
): PaletteColor | null {
  let best: PaletteColor | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const color of palette) {
    const gap = hexDistance(hex, color.hex);
    if (gap < bestDistance) {
      bestDistance = gap;
      best = color;
    }
  }
  return best;
}

function mostDistinctColor(
  from: string,
  palette: readonly PaletteColor[],
  minimumSaturation: number,
): PaletteColor | null {
  const candidates = palette.filter(
    (color) =>
      hexDistance(from, color.hex) >= DISTINCT_DISTANCE &&
      saturationOf(color.hex) >= minimumSaturation,
  );
  const [first] = [...candidates].sort((a, b) => b.share - a.share);
  return first ?? null;
}

export function buildBrandTheme(
  suggestion: BrandSuggestion,
  palette: readonly PaletteColor[],
): ReportThemeInput {
  let primary = suggestion.primary;
  let accent = suggestion.accent;
  if (palette.length > 0) {
    primary = nearestPaletteColor(primary, palette)?.hex ?? primary;
    accent = nearestPaletteColor(accent, palette)?.hex ?? accent;
    if (primary === accent) {
      accent = mostDistinctColor(primary, palette, 0.2)?.hex ?? accent;
    }
  }
  return {
    version: 1,
    font: suggestion.font,
    colors: { primary, accent },
    layout: {
      cover: suggestion.cover,
      tableHead: suggestion.tableHead,
      kpi: suggestion.kpi,
      radius: suggestion.radius,
      density: suggestion.density,
    },
  };
}

export function themeFromPalette(palette: readonly PaletteColor[]): ReportThemeInput | null {
  if (palette.length === 0) {
    return null;
  }
  const ranked = [...palette].sort(
    (a, b) => b.share * (0.4 + saturationOf(b.hex)) - a.share * (0.4 + saturationOf(a.hex)),
  );
  const colorful = ranked.filter((color) => saturationOf(color.hex) >= 0.2);
  const pool = colorful.length > 0 ? colorful : ranked;
  const darkEnough = pool.find((color) => lightnessOf(color.hex) <= 0.4);
  const primary = (darkEnough ?? pool[0] ?? ranked[0])?.hex;
  if (primary === undefined) {
    return null;
  }
  const accent = mostDistinctColor(primary, palette, 0.25)?.hex ?? primary;
  return {
    version: 1,
    font: "sans",
    colors: { primary, accent },
    layout: {
      cover: "band",
      tableHead: "solid",
      kpi: "solid",
      radius: "soft",
      density: "normal",
    },
  };
}
