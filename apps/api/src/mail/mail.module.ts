import { Module } from "@nestjs/common";

import { APP_ENV } from "../config/config.constants.js";
import type { AppEnv } from "../config/env.schema.js";
import { BrevoMailProvider } from "./brevo-mail-provider.js";
import { ConsoleMailProvider } from "./console-mail-provider.js";
import { MAIL_PROVIDER, type MailProvider } from "./mail-provider.js";
import { MailService } from "./mail.service.js";

@Module({
  providers: [
    {
      provide: MAIL_PROVIDER,
      inject: [APP_ENV],
      useFactory: (env: AppEnv): MailProvider => {
        if (env.MAIL_PROVIDER === "brevo") {
          if (env.MAIL_API_KEY === undefined || env.MAIL_FROM === undefined) {
            throw new Error("Thiếu MAIL_API_KEY hoặc MAIL_FROM cho Brevo");
          }
          return new BrevoMailProvider({
            apiKey: env.MAIL_API_KEY,
            fromEmail: env.MAIL_FROM,
            fromName: env.MAIL_FROM_NAME,
          });
        }
        return new ConsoleMailProvider();
      },
    },
    MailService,
  ],
  exports: [MailService],
})
export class MailModule {}
