import { Inject, Injectable } from "@nestjs/common";

import { APP_ENV } from "../config/config.constants.js";
import type { AppEnv } from "../config/env.schema.js";
import { hmacHex } from "../auth/crypto.js";
import type { Database } from "../database/client.js";
import { DATABASE } from "../database/database.constants.js";
import { auditLogs, type ActorType } from "../database/schema/index.js";

export interface AuditEntry {
  actorType: ActorType;
  actorId: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  meta?: Record<string, unknown>;
  ip?: string | null;
}

type AuditExecutor = Pick<Database, "insert">;

@Injectable()
export class AuditService {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    @Inject(APP_ENV) private readonly env: AppEnv,
  ) {}

  async record(entry: AuditEntry, executor: AuditExecutor = this.db): Promise<void> {
    await executor.insert(auditLogs).values({
      actorType: entry.actorType,
      actorId: entry.actorId,
      action: entry.action,
      entity: entry.entity,
      entityId: entry.entityId ?? null,
      meta: entry.meta ?? {},
      ipHash:
        entry.ip === undefined || entry.ip === null
          ? null
          : hmacHex(this.env.SESSION_SECRET, `ip:${entry.ip}`),
    });
  }
}
