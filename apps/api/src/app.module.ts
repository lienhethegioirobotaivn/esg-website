import { Module } from "@nestjs/common";

import { AuthModule } from "./auth/auth.module.js";
import { AdminModule } from "./admin/admin.module.js";
import { CustomersModule } from "./customers/customers.module.js";
import { FeedbackModule } from "./feedback/feedback.module.js";
import { InquiriesModule } from "./inquiries/inquiries.module.js";
import { AuditModule } from "./audit/audit.module.js";
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
import { PostsModule } from "./posts/posts.module.js";
import { ReportsModule } from "./reports/reports.module.js";
import { StatsModule } from "./stats/stats.module.js";
import { TranslationModule } from "./translation/translation.module.js";

@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    RateLimitModule,
    FilesModule,
    AuditModule,
    AdminModule,
    InquiriesModule,
    CustomersModule,
    FeedbackModule,
    MailModule,
    AuthModule,
    TranslationModule,
    PostsModule,
    StatsModule,
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
