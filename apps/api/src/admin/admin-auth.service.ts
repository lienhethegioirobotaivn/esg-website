import { Inject, Injectable } from "@nestjs/common";
import { and, eq, gt, ne, sql } from "drizzle-orm";

import { newSessionToken, sha256Hex } from "../auth/crypto.js";
import { AppError } from "../common/app-error.js";
import { enforceRate } from "../common/enforce-rate.js";
import type { Database } from "../database/client.js";
import { DATABASE } from "../database/database.constants.js";
import { adminSessions, adminUsers } from "../database/schema/index.js";
import { AuditService } from "../audit/audit.service.js";
import { RateLimitService } from "../rate-limit/rate-limit.service.js";
import {
  ADMIN_LOCK_MINUTES,
  ADMIN_LOGIN_MAX_FAILURES,
  ADMIN_LOGIN_RATE_LIMIT,
  ADMIN_PASSWORD_CHANGE_RATE_LIMIT,
  ADMIN_SESSION_MAX_AGE_MS,
} from "./admin.constants.js";
import type { AdminIdentity } from "./admin.types.js";
import { burnPasswordCheck, hashPassword, verifyPassword } from "./password.js";

export interface AdminLoginResult {
  token: string;
  admin: Pick<AdminIdentity, "email" | "name" | "role">;
}

const INVALID_CREDENTIALS = "Email hoặc mật khẩu không đúng.";

@Injectable()
export class AdminAuthService {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    @Inject(RateLimitService) private readonly rateLimit: RateLimitService,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  async login(input: {
    email: string;
    password: string;
    ip: string;
    userAgent?: string | undefined;
  }): Promise<AdminLoginResult> {
    await enforceRate(this.rateLimit, `admin-login:${input.ip}`, ADMIN_LOGIN_RATE_LIMIT);

    const [admin] = await this.db
      .select()
      .from(adminUsers)
      .where(eq(adminUsers.email, input.email))
      .limit(1);

    if (admin === undefined) {
      await burnPasswordCheck(input.password);
      throw new AppError(401, "invalid_credentials", INVALID_CREDENTIALS);
    }

    if (admin.lockedUntil !== null && admin.lockedUntil.getTime() > Date.now()) {
      throw new AppError(429, "admin_locked", "Tài khoản đang bị khóa tạm thời do nhập sai nhiều lần.", {
        retryAfter: Math.max(1, Math.ceil((admin.lockedUntil.getTime() - Date.now()) / 1000)),
      });
    }

    const matches = await verifyPassword(input.password, admin.passwordHash);
    if (!matches || !admin.active) {
      if (!matches) {
        await this.recordFailure(admin.id, admin.failedAttempts, input.ip);
      }
      throw new AppError(401, "invalid_credentials", INVALID_CREDENTIALS);
    }

    const token = newSessionToken();
    await this.db.transaction(async (tx) => {
      await tx
        .update(adminUsers)
        .set({ failedAttempts: 0, lockedUntil: null })
        .where(eq(adminUsers.id, admin.id));
      await tx.insert(adminSessions).values({
        adminId: admin.id,
        tokenHash: sha256Hex(token),
        expiresAt: new Date(Date.now() + ADMIN_SESSION_MAX_AGE_MS),
      });
      await this.audit.record(
        { actorType: "admin", actorId: admin.id, action: "admin.login", entity: "admin_user", entityId: admin.id, ip: input.ip },
        tx,
      );
    });
    return { token, admin: { email: admin.email, name: admin.name, role: admin.role } };
  }

  async resolveSession(token: string): Promise<AdminIdentity | null> {
    const [row] = await this.db
      .select({
        sessionId: adminSessions.id,
        adminId: adminUsers.id,
        email: adminUsers.email,
        name: adminUsers.name,
        role: adminUsers.role,
      })
      .from(adminSessions)
      .innerJoin(adminUsers, eq(adminUsers.id, adminSessions.adminId))
      .where(
        and(
          eq(adminSessions.tokenHash, sha256Hex(token)),
          gt(adminSessions.expiresAt, sql`now()`),
          eq(adminUsers.active, true),
        ),
      )
      .limit(1);
    return row ?? null;
  }

  async logout(admin: AdminIdentity, ip: string): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx.delete(adminSessions).where(eq(adminSessions.id, admin.sessionId));
      await this.audit.record(
        { actorType: "admin", actorId: admin.adminId, action: "admin.logout", entity: "admin_user", entityId: admin.adminId, ip },
        tx,
      );
    });
  }

  async changePassword(
    admin: AdminIdentity,
    input: { currentPassword: string; newPassword: string },
    ip: string,
  ): Promise<void> {
    await enforceRate(
      this.rateLimit,
      `admin-password:${admin.adminId}`,
      ADMIN_PASSWORD_CHANGE_RATE_LIMIT,
    );
    const [row] = await this.db
      .select({ passwordHash: adminUsers.passwordHash })
      .from(adminUsers)
      .where(eq(adminUsers.id, admin.adminId))
      .limit(1);
    if (row === undefined || !(await verifyPassword(input.currentPassword, row.passwordHash))) {
      throw new AppError(400, "wrong_password", "Mật khẩu hiện tại không đúng.");
    }
    const passwordHash = await hashPassword(input.newPassword);
    await this.db.transaction(async (tx) => {
      await tx
        .update(adminUsers)
        .set({ passwordHash, failedAttempts: 0, lockedUntil: null, updatedAt: new Date() })
        .where(eq(adminUsers.id, admin.adminId));
      await tx
        .delete(adminSessions)
        .where(and(eq(adminSessions.adminId, admin.adminId), ne(adminSessions.id, admin.sessionId)));
      await this.audit.record(
        {
          actorType: "admin",
          actorId: admin.adminId,
          action: "admin_user.change_password",
          entity: "admin_user",
          entityId: admin.adminId,
          ip,
        },
        tx,
      );
    });
  }

  private async recordFailure(adminId: string, previous: number, ip: string): Promise<void> {
    const failures = previous + 1;
    const lock = failures >= ADMIN_LOGIN_MAX_FAILURES;
    await this.db
      .update(adminUsers)
      .set({
        failedAttempts: lock ? 0 : failures,
        lockedUntil: lock ? new Date(Date.now() + ADMIN_LOCK_MINUTES * 60_000) : null,
      })
      .where(eq(adminUsers.id, adminId));
    if (lock) {
      await this.audit.record({
        actorType: "system",
        actorId: null,
        action: "admin.locked",
        entity: "admin_user",
        entityId: adminId,
        ip,
      });
    }
  }
}
