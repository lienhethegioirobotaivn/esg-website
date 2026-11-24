import { Controller, Get, HttpStatus, Inject, Res } from "@nestjs/common";
import { sql } from "drizzle-orm";
import type { Response } from "express";

import { DATABASE } from "../database/database.constants.js";
import type { Database } from "../database/client.js";

const DATABASE_CHECK_TIMEOUT_MS = 3000;

export interface HealthBody {
  status: "ok" | "error";
  database: "up" | "down";
  uptimeSeconds: number;
}

@Controller("health")
export class HealthController {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  @Get()
  async check(@Res({ passthrough: true }) response: Response): Promise<HealthBody> {
    const databaseUp = await this.pingDatabase();
    if (!databaseUp) {
      response.status(HttpStatus.SERVICE_UNAVAILABLE);
    }
    return {
      status: databaseUp ? "ok" : "error",
      database: databaseUp ? "up" : "down",
      uptimeSeconds: Math.round(process.uptime()),
    };
  }

  private async pingDatabase(): Promise<boolean> {
    let timer: NodeJS.Timeout | undefined;
    const timeout = new Promise<false>((resolve) => {
      timer = setTimeout(() => resolve(false), DATABASE_CHECK_TIMEOUT_MS);
    });
    const ping = this.db.execute(sql`select 1`).then(
      () => true,
      () => false,
    );
    try {
      return await Promise.race([ping, timeout]);
    } finally {
      clearTimeout(timer);
    }
  }
}
