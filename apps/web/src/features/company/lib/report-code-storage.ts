const REPORT_CODE_STORAGE_KEY = "esg-studio:report-code";

export function getReportCode(): string | null {
  try {
    return window.localStorage.getItem(REPORT_CODE_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function saveReportCode(code: string): void {
  try {
    window.localStorage.setItem(REPORT_CODE_STORAGE_KEY, code);
  } catch {
    return;
  }
}

export function clearReportCode(): void {
  try {
    window.localStorage.removeItem(REPORT_CODE_STORAGE_KEY);
  } catch {
    return;
  }
}
