import { Font } from "@react-pdf/renderer";

export const REPORT_FONT_FAMILY = "DejaVuSans";

let registeredBaseUrl: string | null = null;

export function registerReportFonts(baseUrl: string): void {
  if (registeredBaseUrl === baseUrl) {
    return;
  }
  Font.register({
    family: REPORT_FONT_FAMILY,
    fonts: [
      { src: `${baseUrl}/DejaVuSans.ttf`, fontWeight: 400 },
      { src: `${baseUrl}/DejaVuSans-Bold.ttf`, fontWeight: 700 },
    ],
  });
  Font.registerHyphenationCallback((word) => [word]);
  registeredBaseUrl = baseUrl;
}
