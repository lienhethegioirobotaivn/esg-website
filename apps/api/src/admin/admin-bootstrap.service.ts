import { Inject, Injectable, Logger, type OnApplicationBootstrap } from "@nestjs/common";
import { count } from "drizzle-orm";

import { APP_ENV } from "../config/config.constants.js";
import type { AppEnv } from "../config/env.schema.js";
import type { Database } from "../database/client.js";
import { DATABASE } from "../database/database.constants.js";
import { adminUsers } from "../database/schema/index.js";
import { AuditService } from "../audit/audit.service.js";
import { hashPassword } from "./password.js";

@Injectable()
export class AdminBootstrapService implements OnApplicationBootstrap {
  private readonly logger = new Logger("AdminBootstrap");

  constructor(
    @Inject(DATABASE) private readonly db: Database,
    @Inject(APP_ENV) private readonly env: AppEnv,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.ensureFirstAdmin();
  }

  async ensureFirstAdmin(): Promise<boolean> {
    const email = this.env.ADMIN_BOOTSTRAP_EMAIL;
    const password = this.env.ADMIN_BOOTSTRAP_PASSWORD;
    if (email === undefined || password === undefined) {
      return false;
    }

    const [existing] = await this.db.select({ total: count() }).from(adminUsers);
    if ((existing?.total ?? 0) > 0) {
      return false;
    }

    const passwordHash = await hashPassword(password);
    const created = await this.db.transaction(async (tx) => {
      const rows = await tx
        .insert(adminUsers)
        .values({ email: email.toLowerCase(), name: "Quản trị viên", role: "admin", passwordHash })
        .onConflictDoNothing()
        .returning({ id: adminUsers.id });
      const row = rows[0];
      if (row === undefined) {
        return false;
      }
      await this.audit.record(
        {
          actorType: "system",
          actorId: null,
          action: "admin_user.bootstrap",
          entity: "admin_user",
          entityId: row.id,
          meta: { email: email.toLowerCase() },
        },
        tx,
      );
      return true;
    });
    if (created) {
      this.logger.log(`Đã tạo tài khoản quản trị đầu tiên: ${email.toLowerCase()}`);
    }
    return created;
  }
}
