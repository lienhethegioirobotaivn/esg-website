export const REPORT_PERIODS = ["q1", "q2", "q3", "q4", "full_year"] as const;

export type ReportPeriod = (typeof REPORT_PERIODS)[number];

export const REPORT_PERIOD_LABELS: Record<ReportPeriod, string> = {
  q1: "Quý 1",
  q2: "Quý 2",
  q3: "Quý 3",
  q4: "Quý 4",
  full_year: "Cả năm",
};
