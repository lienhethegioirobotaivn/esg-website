import type { AssigneeView } from "@esg/shared/node";
import { Controller, Get, Header, Inject, UseGuards } from "@nestjs/common";
import { and, asc, eq, inArray } from "drizzle-orm";

import type { Database } from "../database/client.js";
import { DATABASE } from "../database/database.constants.js";
import { adminUsers } from "../database/schema/index.js";
import { AdminSessionGuard, Roles } from "./admin-session.guard.js";

@Controller("admin/assignees")
@UseGuards(AdminSessionGuard)
@Roles("ops")
export class AdminAssigneesController {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  @Get()
  @Header("Cache-Control", "private, no-store")
  async list(): Promise<{ assignees: AssigneeView[] }> {
    const assignees = await this.db
      .select({ id: adminUsers.id, name: adminUsers.name, role: adminUsers.role })
      .from(adminUsers)
      .where(and(eq(adminUsers.active, true), inArray(adminUsers.role, ["admin", "ops"])))
      .orderBy(asc(adminUsers.name), asc(adminUsers.id));
    return { assignees };
  }
}
