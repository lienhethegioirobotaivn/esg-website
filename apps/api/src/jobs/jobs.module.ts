import { Module } from "@nestjs/common";

import { ReportsModule } from "../reports/reports.module.js";
import { MailModule } from "../mail/mail.module.js";
import { MailService } from "../mail/mail.service.js";
import { CleanupService } from "./cleanup.service.js";
import { JOB_DEFINITIONS, JobScheduler, type JobDefinition } from "./job-scheduler.js";

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export function buildJobDefinitions(cleanup: CleanupService, mail: MailService): JobDefinition[] {
  return [
    {
      name: "deliver-outbox",
      intervalMs: 30 * SECOND,
      initialDelayMs: 10 * SECOND,
      track: false,
      run: async () => ({ ...(await mail.deliverDue()) }),
    },
    {
      name: "cleanup-otp-challenges",
      intervalMs: HOUR,
      initialDelayMs: MINUTE,
      track: true,
      run: async () => ({ deleted: await cleanup.otpChallenges() }),
    },
    {
      name: "cleanup-sessions",
      intervalMs: HOUR,
      initialDelayMs: MINUTE,
      track: true,
      run: async () => ({ deleted: await cleanup.sessions() }),
    },
    {
      name: "cleanup-rate-limits",
      intervalMs: DAY,
      initialDelayMs: 2 * MINUTE,
      track: true,
      run: async () => ({ deleted: await cleanup.rateLimits() }),
    },
    {
      name: "cleanup-sent-emails",
      intervalMs: 7 * DAY,
      initialDelayMs: 3 * MINUTE,
      track: true,
      run: async () => ({ deleted: await cleanup.sentEmails() }),
    },
    {
      name: "cleanup-unattached-exports",
      intervalMs: HOUR,
      initialDelayMs: 4 * MINUTE,
      track: true,
      run: async () => ({
        exports: await cleanup.unattachedExports(),
        reports: await cleanup.abandonedReports(),
      }),
    },
    {
      name: "cleanup-orphan-files",
      intervalMs: HOUR,
      initialDelayMs: 5 * MINUTE,
      track: true,
      run: async () => ({
        softDeleted: await cleanup.orphanFiles(),
        purged: await cleanup.purgedFiles(),
      }),
    },
    {
      name: "cleanup-stale-drafts",
      intervalMs: DAY,
      initialDelayMs: 6 * MINUTE,
      track: true,
      run: async () => ({ deleted: await cleanup.staleDrafts() }),
    },
  ];
}

@Module({
  imports: [MailModule, ReportsModule],
  providers: [
    CleanupService,
    {
      provide: JOB_DEFINITIONS,
      inject: [CleanupService, MailService],
      useFactory: buildJobDefinitions,
    },
    JobScheduler,
  ],
  exports: [JobScheduler],
})
export class JobsModule {}
