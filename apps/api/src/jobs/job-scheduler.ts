import {
  Inject,
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnApplicationShutdown,
} from "@nestjs/common";
import { eq, sql } from "drizzle-orm";
import type pg from "pg";

import { APP_ENV } from "../config/config.constants.js";
import type { AppEnv } from "../config/env.schema.js";
import type { Database } from "../database/client.js";
import { DATABASE, DATABASE_POOL } from "../database/database.constants.js";
import { jobRuns } from "../database/schema/index.js";

export interface JobDefinition {
  name: string;
  intervalMs: number;
  initialDelayMs: number;
  track: boolean;
  run(): Promise<Record<string, unknown>>;
}

export const JOB_DEFINITIONS = Symbol("JOB_DEFINITIONS");

export type JobRunOutcome = "ran" | "skipped" | "failed";

@Injectable()
export class JobScheduler implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger("Jobs");
  private readonly timers: NodeJS.Timeout[] = [];
  private readonly running = new Set<string>();

  constructor(
    @Inject(DATABASE_POOL) private readonly pool: pg.Pool,
    @Inject(DATABASE) private readonly db: Database,
    @Inject(APP_ENV) private readonly env: AppEnv,
    @Inject(JOB_DEFINITIONS) private readonly jobs: readonly JobDefinition[],
  ) {}

  onApplicationBootstrap(): void {
    if (!this.env.JOBS_ENABLED) {
      this.logger.log("JOBS_ENABLED=false, không chạy việc nền");
      return;
    }
    for (const job of this.jobs) {
      const first = setTimeout(() => {
        void this.runOnce(job.name);
        const repeat = setInterval(() => void this.runOnce(job.name), job.intervalMs);
        repeat.unref();
        this.timers.push(repeat);
      }, job.initialDelayMs);
      first.unref();
      this.timers.push(first);
    }
    this.logger.log(`Đã lên lịch ${this.jobs.length} việc nền`);
  }

  onApplicationShutdown(): void {
    for (const timer of this.timers) {
      clearTimeout(timer);
      clearInterval(timer);
    }
    this.timers.length = 0;
  }

  async runOnce(name: string): Promise<JobRunOutcome> {
    const job = this.jobs.find((candidate) => candidate.name === name);
    if (job === undefined) {
      throw new Error(`Không có việc nền tên ${name}`);
    }
    if (this.running.has(name)) {
      return "skipped";
    }
    this.running.add(name);

    let client: pg.PoolClient | undefined;
    let locked = false;
    try {
      client = await this.pool.connect();
      const lock = await client.query<{ locked: boolean }>(
        "select pg_try_advisory_lock(hashtext($1)) as locked",
        [`job:${name}`],
      );
      locked = lock.rows[0]?.locked === true;
      if (!locked) {
        return "skipped";
      }
      return await this.execute(job);
    } catch (error) {
      this.logger.error(`Việc nền ${name} lỗi: ${describe(error)}`);
      return "failed";
    } finally {
      if (client !== undefined) {
        if (locked) {
          await client
            .query("select pg_advisory_unlock(hashtext($1))", [`job:${name}`])
            .catch(() => undefined);
        }
        client.release();
      }
      this.running.delete(name);
    }
  }

  private async execute(job: JobDefinition): Promise<JobRunOutcome> {
    let runId: string | undefined;
    if (job.track) {
      const [row] = await this.db
        .insert(jobRuns)
        .values({ job: job.name })
        .returning({ id: jobRuns.id });
      runId = row?.id;
    }

    try {
      const detail = await job.run();
      if (runId !== undefined) {
        await this.db
          .update(jobRuns)
          .set({ status: "succeeded", finishedAt: sql`now()`, detail })
          .where(eq(jobRuns.id, runId));
      }
      return "ran";
    } catch (error) {
      if (runId !== undefined) {
        await this.db
          .update(jobRuns)
          .set({ status: "failed", finishedAt: sql`now()`, detail: { error: describe(error) } })
          .where(eq(jobRuns.id, runId));
      }
      this.logger.error(`Việc nền ${job.name} lỗi: ${describe(error)}`);
      return "failed";
    }
  }
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
