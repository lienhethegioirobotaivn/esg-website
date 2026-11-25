import type { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
import type pg from "pg";

import { AppModule } from "../../src/app.module.js";
import { configureApp } from "../../src/app.setup.js";
import {
  MAIL_PROVIDER,
  type MailSendError,
  type MailMessage,
  type MailProvider,
} from "../../src/mail/mail-provider.js";

export class CapturingMailProvider implements MailProvider {
  readonly messages: MailMessage[] = [];
  failure: MailSendError | null = null;
  delayMs = 0;

  async send(message: MailMessage): Promise<void> {
    if (this.delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.delayMs));
    }
    if (this.failure !== null) {
      throw this.failure;
    }
    this.messages.push(message);
  }

  lastCode(): string {
    const last = this.messages.at(-1);
    const match = last?.text.match(/\b\d{6}\b/);
    if (match === null || match === undefined) {
      throw new Error("Chưa có thư OTP nào được gửi");
    }
    return match[0];
  }
}

export interface TestApp {
  app: NestExpressApplication;
  mail: CapturingMailProvider;
  close: () => Promise<void>;
}

export async function createTestApp(
  databaseUrl: string,
  overrides: Record<string, string> = {},
): Promise<TestApp> {
  const env: Record<string, string> = {
    DATABASE_URL: databaseUrl,
    DATABASE_POOL_MAX: "8",
    JOBS_ENABLED: "false",
    SESSION_SECRET: "test-secret-test-secret-test-secret-123456",
    MAIL_PROVIDER: "console",
    MAIL_DAILY_LIMIT: "300",
    TRUSTED_PROXY: "0",
    ...overrides,
  };
  for (const [key, value] of Object.entries(env)) {
    process.env[key] = value;
  }

  const mail = new CapturingMailProvider();
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(MAIL_PROVIDER)
    .useValue(mail)
    .compile();
  const app = moduleRef.createNestApplication<NestExpressApplication>();
  configureApp(app);
  await app.init();
  return { app, mail, close: () => app.close() };
}

export async function resetState(pool: pg.Pool): Promise<void> {
  await pool.query(
    "truncate rate_limits, otp_challenges, email_outbox, user_sessions, job_runs, users, companies, files, question_banks restart identity cascade",
  );
}
