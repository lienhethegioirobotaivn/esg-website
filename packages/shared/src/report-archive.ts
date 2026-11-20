import { z } from "zod";

import { draftAnswerSchema } from "./draft";
import type { DraftAnswer } from "./draft";
import { reportThemeInputSchema } from "./report-theme";
import type { ReportTheme, ReportThemeInput } from "./report-theme";
import type { ImprovementPlanInput } from "./report-types";

export const REPORT_CODE_PATTERN = /^ESG-\d{8}-[A-Z0-9]{4}$/;

export const REPORT_ARCHIVE_FORMATS = ["pdf", "docx"] as const;
export const REPORT_ARCHIVE_LOCALES = ["vi", "en", "fr", "zh"] as const;
export const REPORT_SNAPSHOT_VERSION = 1;

export type ReportArchiveFormat = (typeof REPORT_ARCHIVE_FORMATS)[number];
export type ReportArchiveLocale = (typeof REPORT_ARCHIVE_LOCALES)[number];

export const REPORT_ARCHIVE_LIMITS = {
  chunkBytes: 2_499_999,
  maxFileBytes: 25 * 1024 * 1024,
  maxChunks: 12,
  maxSnapshotChars: 600_000,
  maxFileNameLength: 120,
  keepExports: 5,
} as const;

export const REPORT_FILE_SIGNATURES: Record<
  ReportArchiveFormat,
  readonly number[]
> = {
  pdf: [0x25, 0x50, 0x44, 0x46, 0x2d],
  docx: [0x50, 0x4b, 0x03, 0x04],
};

export function hasReportFileSignature(
  bytes: Uint8Array,
  format: ReportArchiveFormat,
): boolean {
  return REPORT_FILE_SIGNATURES[format].every(
    (value, index) => bytes[index] === value,
  );
}

export function countReportChunks(
  size: number,
  chunkBytes: number = REPORT_ARCHIVE_LIMITS.chunkBytes,
): number {
  return Math.max(1, Math.ceil(size / chunkBytes));
}

const planTaskSchema = z.object({
  id: z.string().max(100),
  fromId: z.string().max(100),
  description: z.string().max(5000),
  owner: z.string().max(500),
  due: z.string().max(100),
  status: z.string().max(100),
});

export const reportSnapshotSchema = z.object({
  version: z.literal(REPORT_SNAPSHOT_VERSION),
  savedAt: z.string().max(100),
  locale: z.enum(REPORT_ARCHIVE_LOCALES),
  company: z.record(z.string(), z.string()),
  answers: z.record(z.string().min(1), draftAnswerSchema),
  activeGroupId: z.string().min(1).nullable(),
  plan: z.object({
    tasks: z.array(planTaskSchema).max(200),
    goal: z.string().max(5000),
    resources: z.string().max(5000),
    reviewCycle: z.string().max(1000),
  }),
  theme: reportThemeInputSchema.nullable(),
});

export type ReportSnapshot = z.input<typeof reportSnapshotSchema>;

export function themeToInput(theme: ReportTheme): ReportThemeInput | null {
  if (theme.isDefault) {
    return null;
  }
  return {
    version: 1,
    font: theme.font,
    layout: { ...theme.layout },
    colors: { ...theme.colors },
  };
}

export interface ReportSnapshotSource {
  readonly company: Readonly<Record<string, string>>;
  readonly answers: Readonly<Record<string, DraftAnswer>>;
  readonly plan: ImprovementPlanInput;
  readonly theme: ReportTheme;
  readonly locale: ReportArchiveLocale;
  readonly savedAt: string;
  readonly activeGroupId?: string | null;
}

export function buildReportSnapshot(source: ReportSnapshotSource): ReportSnapshot {
  return {
    version: REPORT_SNAPSHOT_VERSION,
    savedAt: source.savedAt,
    locale: source.locale,
    company: { ...source.company },
    answers: { ...source.answers },
    activeGroupId: source.activeGroupId ?? null,
    plan: {
      tasks: source.plan.tasks.map((task) => ({ ...task })),
      goal: source.plan.goal,
      resources: source.plan.resources,
      reviewCycle: source.plan.reviewCycle,
    },
    theme: themeToInput(source.theme),
  };
}

export const reportChunkFieldsSchema = z.object({
  uploadId: z.uuid(),
  format: z.enum(REPORT_ARCHIVE_FORMATS),
  index: z.coerce.number().int().min(0).max(REPORT_ARCHIVE_LIMITS.maxChunks - 1),
  total: z.coerce.number().int().min(1).max(REPORT_ARCHIVE_LIMITS.maxChunks),
});

export const reportFinishSchema = z.object({
  uploadId: z.uuid(),
  reportCode: z.string().regex(REPORT_CODE_PATTERN),
  locale: z.enum(REPORT_ARCHIVE_LOCALES),
  status: z.enum(["draft", "complete"]),
  theme: z.enum(["default", "brand"]),
  companyName: z.string().trim().max(200),
  snapshot: z.string().min(2).max(REPORT_ARCHIVE_LIMITS.maxSnapshotChars),
  files: z
    .array(
      z.object({
        format: z.enum(REPORT_ARCHIVE_FORMATS),
        name: z.string().min(1).max(REPORT_ARCHIVE_LIMITS.maxFileNameLength),
        bytes: z.number().int().min(1).max(REPORT_ARCHIVE_LIMITS.maxFileBytes),
        chunks: z.number().int().min(1).max(REPORT_ARCHIVE_LIMITS.maxChunks),
      }),
    )
    .min(1)
    .max(REPORT_ARCHIVE_FORMATS.length)
    .refine(
      (files) => new Set(files.map((file) => file.format)).size === files.length,
    )
    .refine((files) =>
      files.every((file) => file.chunks === countReportChunks(file.bytes)),
    ),
});

export type ReportFinishInput = z.infer<typeof reportFinishSchema>;
