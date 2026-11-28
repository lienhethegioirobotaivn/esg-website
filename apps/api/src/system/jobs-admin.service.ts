import type { JobRunView, JobView } from "@esg/shared/node";
import { Inject, Injectable } from "@nestjs/common";
import { desc, eq } from "drizzle-orm";

import { AppError } from "../common/app-error.js";
import type { Database } from "../database/client.js";
import { DATABASE } from "../database/database.constants.js";
import { jobRuns } from "../database/schema/index.js";
import { JobScheduler, type JobDefinition, type JobRunOutcome } from "../jobs/job-scheduler.js";

@Injectable()
export class JobsAdminService {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    @Inject(JobScheduler) private readonly scheduler: JobScheduler,
  ) {}

  async list(): Promise<{ jobs: JobView[] }> {
    const jobs: JobView[] = [];
    for (const definition of this.scheduler.definitions()) {
      jobs.push(await this.view(definition));
    }
    return { jobs };
  }

  async run(name: string): Promise<{ outcome: JobRunOutcome; job: JobView }> {
    const definition = this.scheduler.definitions().find((job) => job.name === name);
    if (definition === undefined) {
      throw new AppError(404, "job_not_found", "Không có việc nền này.");
    }
    const outcome = await this.scheduler.runOnce(name);
    return { outcome, job: await this.view(definition) };
  }

  private async view(definition: JobDefinition): Promise<JobView> {
    return {
      name: definition.name,
      intervalSeconds: Math.round(definition.intervalMs / 1000),
      tracked: definition.track,
      lastRun: definition.track ? await this.lastRun(definition.name) : null,
    };
  }

  private async lastRun(name: string): Promise<JobRunView | null> {
    const [row] = await this.db
      .select()
      .from(jobRuns)
      .where(eq(jobRuns.job, name))
      .orderBy(desc(jobRuns.startedAt))
      .limit(1);
    return row === undefined
      ? null
      : {
          status: row.status,
          startedAt: row.startedAt.toISOString(),
          finishedAt: row.finishedAt?.toISOString() ?? null,
          detail: row.detail,
        };
  }
}
