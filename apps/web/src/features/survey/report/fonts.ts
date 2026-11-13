import { Font } from "@react-pdf/renderer";

import type { ReportFontKind } from "@esg/shared";

import type { Locale } from "@/features/locale/constants";

import { splitCjkWord } from "./cjk-break";

export const REPORT_FONT_FAMILY = "DejaVuSans";
const SERIF_FONT_FAMILY = "DejaVuSerif";
const CJK_FONT_FAMILY = "NotoSansSC";

const DEFAULT_FONT_FILES = { regular: "DejaVuSans.ttf", bold: "DejaVuSans-Bold.ttf" };

const FONT_FILES: Record<string, { regular: string; bold: string }> = {
  [REPORT_FONT_FAMILY]: DEFAULT_FONT_FILES,
  [SERIF_FONT_FAMILY]: { regular: "DejaVuSerif.ttf", bold: "DejaVuSerif-Bold.ttf" },
  [CJK_FONT_FAMILY]: { regular: "NotoSansSC-Regular.ttf", bold: "NotoSansSC-Bold.ttf" },
};

const registered = new Set<string>();

let hyphenationDisabled = false;

export function reportFontFamily(locale: Locale, font: ReportFontKind = "sans"): string {
  if (locale === "zh") {
    return CJK_FONT_FAMILY;
  }
  return font === "serif" ? SERIF_FONT_FAMILY : REPORT_FONT_FAMILY;
}

export function registerReportFonts(
  baseUrl: string,
  locale: Locale,
  font: ReportFontKind = "sans",
): void {
  const family = reportFontFamily(locale, font);
  const key = `${family}|${baseUrl}`;
  if (!registered.has(key)) {
    const files = FONT_FILES[family] ?? DEFAULT_FONT_FILES;
    Font.register({
      family,
      fonts: [
        { src: `${baseUrl}/${files.regular}`, fontWeight: 400 },
        { src: `${baseUrl}/${files.bold}`, fontWeight: 700 },
      ],
    });
    registered.add(key);
  }
  if (!hyphenationDisabled) {
    Font.registerHyphenationCallback(splitCjkWord);
    hyphenationDisabled = true;
  }
}
