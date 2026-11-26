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

const DEV_SESSION_SECRET = "dev-only-session-secret-do-not-use-in-production-0123456789";

const MAIL_PROVIDERS = ["console", "brevo"] as const;

const nonNegativeInt = z.coerce.number().int().min(0).max(10);

const baseEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  DATABASE_URL: databaseUrl,
  DATABASE_POOL_MAX: z.coerce.number().int().min(1).max(100).default(10),
  RUN_MIGRATIONS_ON_START: booleanFromString.default(false),
  SESSION_SECRET: z
    .string()
    .min(32, { message: "phải dài ít nhất 32 ký tự" })
    .optional(),
  MAIL_PROVIDER: z.enum(MAIL_PROVIDERS).default("console"),
  MAIL_API_KEY: z.string().min(1).optional(),
  MAIL_FROM: z.email({ message: "phải là một địa chỉ email" }).optional(),
  MAIL_FROM_NAME: z.string().min(1).max(100).default("ESG Report Online"),
  MAIL_DAILY_LIMIT: z.coerce.number().int().min(1).max(1_000_000).default(300),
  TRUSTED_PROXY: nonNegativeInt.default(0),
  JOBS_ENABLED: booleanFromString.default(true),
  STORAGE_DIR: z.string().min(1).default("./storage"),
  ADMIN_BOOTSTRAP_EMAIL: z.email({ message: "phải là một địa chỉ email" }).optional(),
  ADMIN_BOOTSTRAP_PASSWORD: z
    .string()
    .min(12, { message: "phải dài ít nhất 12 ký tự" })
    .optional(),
  ADMIN_NOTIFY_EMAIL: z.email({ message: "phải là một địa chỉ email" }).optional(),
  PUBLIC_BASE_URL: z.url({ message: "phải là một địa chỉ http(s)://" }).default("http://localhost:3000"),
});

export const envSchema = baseEnvSchema
  .superRefine((env, ctx) => {
    if (env.NODE_ENV === "production" && env.SESSION_SECRET === undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["SESSION_SECRET"],
        message: "bắt buộc, chưa được đặt (môi trường production)",
      });
    }
    if ((env.ADMIN_BOOTSTRAP_EMAIL === undefined) !== (env.ADMIN_BOOTSTRAP_PASSWORD === undefined)) {
      ctx.addIssue({
        code: "custom",
        path: ["ADMIN_BOOTSTRAP_PASSWORD"],
        message: "ADMIN_BOOTSTRAP_EMAIL và ADMIN_BOOTSTRAP_PASSWORD phải được đặt cùng nhau",
      });
    }
    if (env.MAIL_PROVIDER === "console" && env.NODE_ENV === "production") {
      ctx.addIssue({
        code: "custom",
        path: ["MAIL_PROVIDER"],
        message: "không được dùng \"console\" ở production, hãy đặt \"brevo\"",
      });
    }
    if (env.MAIL_PROVIDER === "brevo") {
      if (env.MAIL_API_KEY === undefined) {
        ctx.addIssue({
          code: "custom",
          path: ["MAIL_API_KEY"],
          message: "bắt buộc khi MAIL_PROVIDER=brevo",
        });
      }
      if (env.MAIL_FROM === undefined) {
        ctx.addIssue({
          code: "custom",
          path: ["MAIL_FROM"],
          message: "bắt buộc khi MAIL_PROVIDER=brevo",
        });
      }
    }
  })
  .transform((env) => ({
    ...env,
    SESSION_SECRET: env.SESSION_SECRET ?? DEV_SESSION_SECRET,
  }));

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
