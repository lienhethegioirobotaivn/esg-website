import { msg } from "./i18n";

export const REPORT_PERIODS = ["q1", "q2", "q3", "q4", "full_year"] as const;

export type ReportPeriod = (typeof REPORT_PERIODS)[number];

export const REPORT_PERIOD_LABELS: Record<ReportPeriod, string> = {
  q1: msg("Quý 1"),
  q2: msg("Quý 2"),
  q3: msg("Quý 3"),
  q4: msg("Quý 4"),
  full_year: msg("Cả năm"),
};
