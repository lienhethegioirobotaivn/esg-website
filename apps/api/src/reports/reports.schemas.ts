import {
  EXPORT_ID_PATTERN,
  REPORT_ARCHIVE_FORMATS,
  REPORT_ARCHIVE_LIMITS,
  REPORT_ARCHIVE_LOCALES,
  REPORT_CODE_PATTERN,
} from "@esg/shared/node";
import { z } from "zod";

export const exportFieldsSchema = z.object({
  reportCode: z.string().regex(REPORT_CODE_PATTERN),
  locale: z.enum(REPORT_ARCHIVE_LOCALES),
  status: z.enum(["draft", "complete"]),
  theme: z.enum(["default", "brand"]),
  snapshot: z.string().min(2).max(REPORT_ARCHIVE_LIMITS.maxSnapshotChars),
});

export const attachBodySchema = z.object({
  attachToken: z.string().min(10).max(300),
});

export const claimBodySchema = z.object({
  reportCode: z.string().regex(REPORT_CODE_PATTERN),
  claimToken: z.string().min(10).max(300),
});

export const exportIdParamSchema = z.string().regex(EXPORT_ID_PATTERN);
export const formatParamSchema = z.enum(REPORT_ARCHIVE_FORMATS);

export type ExportFields = z.infer<typeof exportFieldsSchema>;
