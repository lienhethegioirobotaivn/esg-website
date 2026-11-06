import { z } from "zod";

const envSchema = z.object({
  GEMINI_API_KEY: z.string().min(1, "Thiếu GEMINI_API_KEY trong tools/esg-agents/.env"),
  DISCOVER_MODEL: z.string().min(1).default("gemini-3.8-flash"),
  EXTRACT_MODEL: z.string().min(1).default("gemini-3.8-flash"),
  REQUEST_DELAY_MS: z.coerce.number().int().min(0).default(13000),
});

export type Config = z.infer<typeof envSchema>;

export function loadConfig(): Config {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const message = parsed.error.issues.map((issue) => issue.message).join("; ");
    throw new Error(message);
  }
  return parsed.data;
}
