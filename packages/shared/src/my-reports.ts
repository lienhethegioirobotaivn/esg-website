import { z } from "zod";

import { EXPORT_ID_PATTERN } from "./auth";
import {
  REPORT_ARCHIVE_FORMATS,
  REPORT_ARCHIVE_LOCALES,
  REPORT_CODE_PATTERN,
  reportSnapshotSchema,
} from "./report-archive";

export const myReportSchema = z.object({
  exportId: z.string().regex(EXPORT_ID_PATTERN),
  reportCode: z.string().regex(REPORT_CODE_PATTERN),
  time: z.string().max(40),
  locale: z.enum(REPORT_ARCHIVE_LOCALES),
  status: z.enum(["draft", "complete"]),
  company: z.string().max(200),
  theme: z.enum(["default", "brand"]),
  pdf: z.boolean(),
  docx: z.boolean(),
});

export const myReportListSchema = z.object({
  reports: z.array(myReportSchema),
});

export const myReportFormatSchema = z.enum(REPORT_ARCHIVE_FORMATS);

export const myReportSnapshotResponseSchema = z.object({
  snapshot: reportSnapshotSchema,
  reportCode: z.string().regex(REPORT_CODE_PATTERN),
});

export type MyReport = z.infer<typeof myReportSchema>;

export interface MyReportGroup {
  readonly reportCode: string;
  readonly company: string;
  readonly latestTime: string;
  readonly reports: readonly MyReport[];
}

export function groupMyReports(reports: readonly MyReport[]): MyReportGroup[] {
  const groups = new Map<string, MyReport[]>();
  for (const report of reports) {
    const list = groups.get(report.reportCode) ?? [];
    list.push(report);
    groups.set(report.reportCode, list);
  }
  return [...groups.entries()]
    .map(([reportCode, items]) => {
      const sorted = [...items].sort((a, b) =>
        a.time === b.time
          ? b.exportId.localeCompare(a.exportId)
          : b.time.localeCompare(a.time),
      );
      const named = sorted.find((item) => item.company !== "");
      return {
        reportCode,
        company: named?.company ?? "",
        latestTime: sorted[0]?.time ?? "",
        reports: sorted,
      };
    })
    .sort((a, b) => b.latestTime.localeCompare(a.latestTime));
}
