import { Module } from "@nestjs/common";

import { AuthModule } from "./auth/auth.module.js";
import { CompaniesModule } from "./companies/companies.module.js";
import { ConfigModule } from "./config/config.module.js";
import { DatabaseModule } from "./database/database.module.js";
import { DraftsModule } from "./drafts/drafts.module.js";
import { EvidenceModule } from "./evidence/evidence.module.js";
import { FilesModule } from "./files/files.module.js";
import { HealthModule } from "./health/health.module.js";
import { JobsModule } from "./jobs/jobs.module.js";
import { MailModule } from "./mail/mail.module.js";
import { QuestionBankModule } from "./question-bank/question-bank.module.js";
import { RateLimitModule } from "./rate-limit/rate-limit.module.js";
import { ReportsModule } from "./reports/reports.module.js";

@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    RateLimitModule,
    FilesModule,
    MailModule,
    AuthModule,
    JobsModule,
    QuestionBankModule,
    CompaniesModule,
    ReportsModule,
    DraftsModule,
    EvidenceModule,
    HealthModule,
  ],
})
export class AppModule {}
