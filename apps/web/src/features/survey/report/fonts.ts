import { Font } from "@react-pdf/renderer";

import type { Locale } from "@/features/locale/constants";

export const REPORT_FONT_FAMILY = "DejaVuSans";
const CJK_FONT_FAMILY = "NotoSansSC";

const registered = new Set<string>();
let hyphenationDisabled = false;

export function reportFontFamily(locale: Locale): string {
  return locale === "zh" ? CJK_FONT_FAMILY : REPORT_FONT_FAMILY;
}

export function registerReportFonts(baseUrl: string, locale: Locale): void {
  const family = reportFontFamily(locale);
  const key = `${family}|${baseUrl}`;
  if (!registered.has(key)) {
    const files =
      family === CJK_FONT_FAMILY
        ? { regular: "NotoSansSC-Regular.ttf", bold: "NotoSansSC-Bold.ttf" }
        : { regular: "DejaVuSans.ttf", bold: "DejaVuSans-Bold.ttf" };
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
    Font.registerHyphenationCallback((word) => [word]);
    hyphenationDisabled = true;
  }
}
