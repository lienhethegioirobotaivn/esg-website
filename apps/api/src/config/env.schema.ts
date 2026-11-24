import { z } from "zod";

const booleanFromString = z
  .enum(["true", "false", "1", "0"])
  .transform((value) => value === "true" || value === "1");

const databaseUrl = z
  .string()
  .min(1)
  .refine(
    (value) => {
      try {
        const protocol = new URL(value).protocol;
        return protocol === "postgres:" || protocol === "postgresql:";
      } catch {
        return false;
      }
    },
    { message: "phải là địa chỉ postgres:// hoặc postgresql://" },
  );

export const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  DATABASE_URL: databaseUrl,
  DATABASE_POOL_MAX: z.coerce.number().int().min(1).max(100).default(10),
  RUN_MIGRATIONS_ON_START: booleanFromString.default(false),
});

export type AppEnv = z.infer<typeof envSchema>;

export class EnvValidationError extends Error {
  readonly issues: readonly string[];

  constructor(issues: readonly string[]) {
    super(
      [
        "Biến môi trường không hợp lệ, API không khởi động:",
        ...issues.map((issue) => `  - ${issue}`),
      ].join("\n"),
    );
    this.name = "EnvValidationError";
    this.issues = issues;
  }
}

export function loadEnv(source: NodeJS.ProcessEnv): AppEnv {
  const normalized: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(source)) {
    normalized[key] = value === "" ? undefined : value;
  }

  const result = envSchema.safeParse(normalized);
  if (result.success) {
    return result.data;
  }

  const issues = result.error.issues.map((issue) => {
    const name = issue.path.join(".") || "(không rõ)";
    const missing = issue.code === "invalid_type" && normalized[name] === undefined;
    return missing ? `${name}: bắt buộc, chưa được đặt` : `${name}: ${issue.message}`;
  });
  throw new EnvValidationError(issues);
}
