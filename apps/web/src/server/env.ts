import "server-only";

import { z } from "zod";

const emptyToUndefined = (value: unknown): unknown =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

const envSchema = z.object({
  GOOGLE_SHEET_QUESTIONS_ID: z
    .string()
    .trim()
    .min(1, "Thiếu GOOGLE_SHEET_QUESTIONS_ID"),
  GOOGLE_APPS_SCRIPT_URL: z.preprocess(
    emptyToUndefined,
    z.string().url().optional(),
  ),
  GOOGLE_APPS_SCRIPT_SECRET: z.preprocess(
    emptyToUndefined,
    z.string().min(1).optional(),
  ),
  ADMIN_PASSWORD: z.preprocess(
    emptyToUndefined,
    z.string().min(8, "ADMIN_PASSWORD phải có ít nhất 8 ký tự").optional(),
  ),
  ADMIN_SESSION_SECRET: z.preprocess(
    emptyToUndefined,
    z.string().min(16).optional(),
  ),
  ENABLE_AI_TOOLS: z
    .preprocess(emptyToUndefined, z.enum(["true", "false"]).default("false"))
    .transform((value) => value === "true"),
  GEMINI_API_KEY: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
  GEMINI_MODEL: z.preprocess(
    emptyToUndefined,
    z.string().min(1).default("gemini-3.8-flash"),
  ),
  CRON_SECRET: z.preprocess(emptyToUndefined, z.string().min(16).optional()),
  SURVEY_REVALIDATE_SECONDS: z.preprocess(
    emptyToUndefined,
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
