import { DEFAULT_REPORT_THEME, resolveReportTheme } from "@esg/shared";
import type { ReportTheme, ReportThemeInput } from "@esg/shared";

const STORAGE_KEY = "esg-brand-theme-v1";

export function loadBrandTheme(): ReportTheme {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === null) {
      return DEFAULT_REPORT_THEME;
    }
    return resolveReportTheme(JSON.parse(raw));
  } catch {
    return DEFAULT_REPORT_THEME;
  }
}

export function saveBrandTheme(input: ReportThemeInput): boolean {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(input));
    return true;
  } catch {
    return false;
  }
}

export function clearBrandTheme(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    return;
  }
}
