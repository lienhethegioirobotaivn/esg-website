import { Inject, Injectable } from "@nestjs/common";
import { and, asc, count, eq, ne } from "drizzle-orm";

import { AppError } from "../common/app-error.js";
import type { Database } from "../database/client.js";
import { DATABASE } from "../database/database.constants.js";
import { adminSessions, adminUsers, type AdminRole } from "../database/schema/index.js";
import { AuditService } from "../audit/audit.service.js";
import type { AdminIdentity } from "./admin.types.js";
import type { CreateAdminInput, UpdateAdminInput } from "./admin.schemas.js";
import { hashPassword } from "./password.js";

export interface AdminUserView {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
  active: boolean;
  lockedUntil: string | null;
  createdAt: string;
}

const UNIQUE_VIOLATION = "23505";

function isUniqueViolation(error: unknown): boolean {
  let current: unknown = error;
  while (typeof current === "object" && current !== null) {
    if ((current as { code?: unknown }).code === UNIQUE_VIOLATION) {
      return true;
    }
    current = (current as { cause?: unknown }).cause;
  }
  return false;
}

const columns = {
  id: adminUsers.id,
  email: adminUsers.email,
  name: adminUsers.name,
  role: adminUsers.role,
  active: adminUsers.active,
  lockedUntil: adminUsers.lockedUntil,
  createdAt: adminUsers.createdAt,
};

function toView(row: {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
  active: boolean;
  lockedUntil: Date | null;
  createdAt: Date;
}): AdminUserView {
  return {
    ...row,
    lockedUntil: row.lockedUntil?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

@Injectable()
export class AdminUsersService {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  async list(): Promise<{ users: AdminUserView[] }> {
    const rows = await this.db.select(columns).from(adminUsers).orderBy(asc(adminUsers.createdAt), asc(adminUsers.id));
    return { users: rows.map(toView) };
  }

  async create(input: CreateAdminInput, actor: AdminIdentity, ip: string): Promise<AdminUserView> {
    const passwordHash = await hashPassword(input.password);
    try {
      return await this.db.transaction(async (tx) => {
        const [row] = await tx
          .insert(adminUsers)
          .values({ email: input.email, name: input.name, role: input.role, passwordHash })
          .returning(columns);
        if (row === undefined) {
          throw new Error("Không tạo được tài khoản quản trị");
        }
        await this.audit.record(
          {
            actorType: "admin",
            actorId: actor.adminId,
            action: "admin_user.create",
            entity: "admin_user",
            entityId: row.id,
            meta: { email: row.email, role: row.role },
            ip,
          },
          tx,
        );
        return toView(row);
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new AppError(409, "email_taken", "Email này đã có tài khoản quản trị.");
      }
      throw error;
    }
  }

  async update(id: string, input: UpdateAdminInput, actor: AdminIdentity, ip: string): Promise<AdminUserView> {
    const passwordHash = input.password === undefined ? undefined : await hashPassword(input.password);

    return this.db.transaction(async (tx) => {
      const [current] = await tx
        .select({ id: adminUsers.id, role: adminUsers.role, active: adminUsers.active })
        .from(adminUsers)
        .where(eq(adminUsers.id, id))
        .for("update");
      if (current === undefined) {
        throw new AppError(404, "not_found", "Không tìm thấy tài khoản quản trị.");
      }

      const losesAdmin =
        current.role === "admin" &&
        current.active &&
        ((input.role !== undefined && input.role !== "admin") || input.active === false);
      if (losesAdmin) {
        if (id === actor.adminId) {
          throw new AppError(409, "last_admin", "Bạn không thể tự hạ quyền hoặc vô hiệu hóa chính mình.");
        }
        const [others] = await tx
          .select({ total: count() })
          .from(adminUsers)
          .where(and(eq(adminUsers.role, "admin"), eq(adminUsers.active, true), ne(adminUsers.id, id)));
        if ((others?.total ?? 0) === 0) {
          throw new AppError(409, "last_admin", "Phải còn ít nhất một quản trị viên đang hoạt động.");
        }
      }

      const [row] = await tx
        .update(adminUsers)
        .set({
          ...(input.name === undefined ? {} : { name: input.name }),
          ...(input.role === undefined ? {} : { role: input.role }),
          ...(input.active === undefined ? {} : { active: input.active }),
          ...(passwordHash === undefined ? {} : { passwordHash, failedAttempts: 0, lockedUntil: null }),
          updatedAt: new Date(),
        })
        .where(eq(adminUsers.id, id))
        .returning(columns);
      if (row === undefined) {
        throw new AppError(404, "not_found", "Không tìm thấy tài khoản quản trị.");
      }

      if (input.active === false || passwordHash !== undefined || input.role !== undefined) {
        await tx.delete(adminSessions).where(eq(adminSessions.adminId, id));
      }
      await this.audit.record(
        {
          actorType: "admin",
          actorId: actor.adminId,
          action: "admin_user.update",
          entity: "admin_user",
          entityId: id,
          meta: {
            changed: Object.keys(input).map((key) => (key === "password" ? "password" : key)),
            ...(input.role === undefined ? {} : { role: input.role }),
            ...(input.active === undefined ? {} : { active: input.active }),
          },
          ip,
        },
        tx,
      );
      return toView(row);
    });
  }
}
