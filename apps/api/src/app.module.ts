import { Module } from "@nestjs/common";

import { AuthModule } from "./auth/auth.module.js";
import { ConfigModule } from "./config/config.module.js";
import { DatabaseModule } from "./database/database.module.js";
import { HealthModule } from "./health/health.module.js";
import { JobsModule } from "./jobs/jobs.module.js";
import { MailModule } from "./mail/mail.module.js";
import { QuestionBankModule } from "./question-bank/question-bank.module.js";
import { RateLimitModule } from "./rate-limit/rate-limit.module.js";

@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    RateLimitModule,
    MailModule,
    AuthModule,
    JobsModule,
    QuestionBankModule,
    HealthModule,
  ],
})
export class AppModule {}
