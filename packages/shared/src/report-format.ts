import type { ReportPeriod } from "./report-period";

const VIETNAM_OFFSET_MS = 7 * 60 * 60 * 1000;

const PERIOD_RANGES: Record<ReportPeriod, readonly [string, string]> = {
  q1: ["01/01", "31/03"],
  q2: ["01/04", "30/06"],
  q3: ["01/07", "30/09"],
  q4: ["01/10", "31/12"],
  full_year: ["01/01", "31/12"],
};

function isReportPeriod(value: string): value is ReportPeriod {
  return value in PERIOD_RANGES;
}

export function formatPeriodRange(period: string, year: string): string {
  if (!isReportPeriod(period) || year.trim() === "") {
    return "Chưa xác định";
  }
  const [start, end] = PERIOD_RANGES[period];
  return `${start}/${year} – ${end}/${year}`;
}

export function formatVietnamDate(iso: string): string {
  const time = new Date(iso).getTime();
  if (Number.isNaN(time)) {
    return "";
  }
  const shifted = new Date(time + VIETNAM_OFFSET_MS).toISOString();
  return `${shifted.slice(8, 10)}/${shifted.slice(5, 7)}/${shifted.slice(0, 4)}`;
}

export function formatVersionStamp(iso: string): string {
  const time = new Date(iso).getTime();
  if (Number.isNaN(time)) {
    return "";
  }
  const shifted = new Date(time + VIETNAM_OFFSET_MS).toISOString();
  return `${shifted.slice(0, 10).replaceAll("-", "")}-${shifted.slice(11, 16).replace(":", "")}`;
}

export function parseQuantity(text: string): number | null {
  const value = text.trim();
  if (value === "" || /^\d{1,3}(\.\d{3})+$/.test(value)) {
    return null;
  }
  if (!/^\d+([.,]\d+)?$/.test(value)) {
    return null;
  }
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

export function formatQuantity(value: number): string {
  return new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 3 }).format(
    value,
  );
}
