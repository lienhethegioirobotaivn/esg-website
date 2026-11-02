import "server-only";

import { z } from "zod";

const optionalText = z.preprocess(
  (value) =>
    typeof value === "string" && value.trim() === "" ? undefined : value,
  z.string().min(1).optional(),
);

const optionalUrl = z.preprocess(
  (value) =>
    typeof value === "string" && value.trim() === "" ? undefined : value,
  z.string().url().optional(),
);

const envSchema = z.object({
  GOOGLE_SHEET_QUESTIONS_ID: z
    .string()
    .trim()
    .min(1, "Thiếu GOOGLE_SHEET_QUESTIONS_ID"),
  GOOGLE_SHEET_PROJECT_ID: optionalText,
  GOOGLE_DRIVE_LOGO_FOLDER_ID: optionalText,
  GOOGLE_APPS_SCRIPT_URL: optionalUrl,
  GOOGLE_APPS_SCRIPT_SECRET: optionalText,
  SURVEY_REVALIDATE_SECONDS: z.preprocess(
    (value) =>
      typeof value === "string" && value.trim() === "" ? undefined : value,
    z.coerce.number().int().min(0).default(300),
  ),
});

export type ServerEnv = z.infer<typeof envSchema>;

let cached: ServerEnv | null = null;

export function getServerEnv(): ServerEnv {
  if (cached === null) {
    const result = envSchema.safeParse(process.env);
    if (!result.success) {
      const detail = result.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join("; ");
      throw new Error(`Biến môi trường không hợp lệ. ${detail}`);
    }
    cached = result.data;
  }
  return cached;
}
