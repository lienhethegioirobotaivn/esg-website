export const REPORT_PERIODS = ["q1", "q2", "q3", "q4", "full_year"] as const;

export type ReportPeriod = (typeof REPORT_PERIODS)[number];
