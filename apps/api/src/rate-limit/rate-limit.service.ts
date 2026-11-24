import { Inject, Injectable } from "@nestjs/common";
import { sql } from "drizzle-orm";

import type { Database } from "../database/client.js";
import { DATABASE } from "../database/database.constants.js";
import { rateLimits } from "../database/schema/index.js";
import { secondsUntil, windowBounds } from "./window.js";

export interface RateLimitRule {
  key: string;
  limit: number;
  windowSeconds: number;
}

export interface RateLimitResult {
  allowed: boolean;
  hits: number;
  retryAfter: number;
}

@Injectable()
export class RateLimitService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async hit(rule: RateLimitRule, now: Date = new Date()): Promise<RateLimitResult> {
    const { start, end } = windowBounds(now, rule.windowSeconds);
    const [row] = await this.db
      .insert(rateLimits)
      .values({ key: `${rule.key}|${rule.windowSeconds}`, windowStart: start, hits: 1 })
      .onConflictDoUpdate({
        target: [rateLimits.key, rateLimits.windowStart],
        set: { hits: sql`${rateLimits.hits} + 1` },
      })
      .returning({ hits: rateLimits.hits });

    const hits = row?.hits ?? 1;
    return { allowed: hits <= rule.limit, hits, retryAfter: secondsUntil(end, now) };
  }

  async hitAll(rules: readonly RateLimitRule[], now: Date = new Date()): Promise<RateLimitResult> {
    let last: RateLimitResult = { allowed: true, hits: 0, retryAfter: 0 };
    for (const rule of rules) {
      last = await this.hit(rule, now);
      if (!last.allowed) {
        return last;
      }
    }
    return last;
  }
}
