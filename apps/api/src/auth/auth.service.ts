import { Inject, Injectable } from "@nestjs/common";
import type { Request } from "express";
import { and, desc, eq, gt, isNull, sql } from "drizzle-orm";

import { AppError } from "../common/app-error.js";
import { APP_ENV } from "../config/config.constants.js";
import type { AppEnv } from "../config/env.schema.js";
import type { Database } from "../database/client.js";
import { DATABASE } from "../database/database.constants.js";
import { otpChallenges, userSessions, users } from "../database/schema/index.js";
import type { MailLocale } from "../mail/mail-templates.js";
import { MailService } from "../mail/mail.service.js";
import { RateLimitService, type RateLimitRule } from "../rate-limit/rate-limit.service.js";
import { secondsUntil } from "../rate-limit/window.js";
import {
  AUTH_LIMITS,
  OTP_RULES,
  SESSION_MAX_AGE_MS,
  USER_COOKIE_NAME,
} from "./auth.constants.js";
import type { AuthUser } from "./auth.types.js";
import { readCookie } from "./cookies.js";
import { generateOtpCode, hmacHex, newSessionToken, safeEqualHex, sha256Hex } from "./crypto.js";

const USER_AGENT_MAX_LENGTH = 255;
const HOUR_MS = 3_600_000;

export interface RequestOtpInput {
  email: string;
  locale: MailLocale;
  ip: string;
}

export interface RequestOtpResult {
  resendAfter: number;
  expiresIn: number;
}

export interface VerifyOtpInput {
  email: string;
  code: string;
  ip: string;
  userAgent: string | undefined;
}

export interface VerifyOtpResult {
  email: string;
  token: string;
}

type VerifyOutcome =
  | { kind: "expired" }
  | { kind: "locked" }
  | { kind: "invalid"; triesLeft: number }
  | { kind: "verified"; token: string };

@Injectable()
export class AuthService {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    @Inject(APP_ENV) private readonly env: AppEnv,
    @Inject(RateLimitService) private readonly rateLimit: RateLimitService,
    @Inject(MailService) private readonly mail: MailService,
  ) {}

  async requestOtp(input: RequestOtpInput): Promise<RequestOtpResult> {
    await this.enforceLimits("request", input.ip);
    await this.mail.assertCanSendOtp();

    const code = generateOtpCode(OTP_RULES.codeLength);
    const codeHash = this.hashCode(input.email, code);

    const queued = await this.db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`otp:${input.email}`}))`);

      const now = new Date();
      const recent = await tx
        .select({ createdAt: otpChallenges.createdAt })
        .from(otpChallenges)
        .where(
          and(
            eq(otpChallenges.email, input.email),
            gt(otpChallenges.createdAt, new Date(now.getTime() - HOUR_MS)),
          ),
        )
        .orderBy(desc(otpChallenges.createdAt));

      const latest = recent[0];
      if (latest !== undefined) {
        const readyAt = new Date(latest.createdAt.getTime() + OTP_RULES.resendSeconds * 1000);
        if (readyAt > now) {
          throw new AppError(
            429,
            "otp_wait",
            "Bạn vừa yêu cầu mã. Vui lòng chờ một lát rồi gửi lại.",
            { retryAfter: secondsUntil(readyAt, now) },
          );
        }
      }
      const oldest = recent[recent.length - 1];
      if (recent.length >= OTP_RULES.perEmailPerHour && oldest !== undefined) {
        const freeAt = new Date(oldest.createdAt.getTime() + HOUR_MS);
        throw new AppError(
          429,
          "otp_hourly_limit",
          "Email này đã yêu cầu mã quá nhiều lần. Vui lòng thử lại sau.",
          { retryAfter: secondsUntil(freeAt, now) },
        );
      }

      await tx
        .update(otpChallenges)
        .set({ consumedAt: now })
        .where(and(eq(otpChallenges.email, input.email), isNull(otpChallenges.consumedAt)));

      const [challenge] = await tx
        .insert(otpChallenges)
        .values({
          email: input.email,
          codeHash,
          expiresAt: new Date(now.getTime() + OTP_RULES.ttlSeconds * 1000),
        })
        .returning({ id: otpChallenges.id });
      if (challenge === undefined) {
        throw new Error("Không tạo được mã xác nhận");
      }

      const outboxId = await this.mail.enqueue(
        { to: input.email, template: "otp", payload: { code, locale: input.locale } },
        tx,
      );
      return { challengeId: challenge.id, outboxId };
    });

    const outcome = await this.mail.deliver(queued.outboxId);
    if (outcome !== "sent") {
      await this.db.delete(otpChallenges).where(eq(otpChallenges.id, queued.challengeId));
      throw new AppError(
        502,
        "mail_unavailable",
        "Chưa gửi được mã xác nhận. Vui lòng thử lại sau.",
      );
    }

    return { resendAfter: OTP_RULES.resendSeconds, expiresIn: OTP_RULES.ttlSeconds };
  }

  async verifyOtp(input: VerifyOtpInput): Promise<VerifyOtpResult> {
    await this.enforceLimits("verify", input.ip);

    const outcome = await this.db.transaction(async (tx): Promise<VerifyOutcome> => {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`otp:${input.email}`}))`);

      const now = new Date();
      const [challenge] = await tx
        .select()
        .from(otpChallenges)
        .where(and(eq(otpChallenges.email, input.email), isNull(otpChallenges.consumedAt)))
        .orderBy(desc(otpChallenges.createdAt))
        .limit(1);

      if (challenge === undefined || challenge.expiresAt <= now) {
        return { kind: "expired" };
      }
      if (challenge.attempts >= OTP_RULES.maxTries) {
        return { kind: "locked" };
      }

      const matches = safeEqualHex(this.hashCode(input.email, input.code), challenge.codeHash);
      if (!matches) {
        const attempts = challenge.attempts + 1;
        await tx.update(otpChallenges).set({ attempts }).where(eq(otpChallenges.id, challenge.id));
        return { kind: "invalid", triesLeft: Math.max(0, OTP_RULES.maxTries - attempts) };
      }

      await tx
        .update(otpChallenges)
        .set({ consumedAt: now })
        .where(eq(otpChallenges.id, challenge.id));

      const [user] = await tx
        .insert(users)
        .values({ email: input.email, emailVerifiedAt: now, lastLoginAt: now })
        .onConflictDoUpdate({
          target: users.email,
          set: {
            emailVerifiedAt: sql`coalesce(${users.emailVerifiedAt}, ${now.toISOString()}::timestamptz)`,
            lastLoginAt: now,
            updatedAt: now,
          },
        })
        .returning({ id: users.id });
      if (user === undefined) {
        throw new Error("Không tạo được người dùng");
      }

      const token = newSessionToken();
      await tx.insert(userSessions).values({
        userId: user.id,
        tokenHash: sha256Hex(token),
        expiresAt: new Date(now.getTime() + SESSION_MAX_AGE_MS),
        userAgent: input.userAgent?.slice(0, USER_AGENT_MAX_LENGTH) ?? null,
        ipHash: this.hashIp(input.ip),
      });
      return { kind: "verified", token };
    });

    switch (outcome.kind) {
      case "verified":
        return { email: input.email, token: outcome.token };
      case "invalid":
        throw new AppError(400, "otp_invalid", "Mã chưa đúng. Vui lòng kiểm tra lại.", {
          triesLeft: outcome.triesLeft,
        });
      case "locked":
        throw new AppError(
          429,
          "otp_locked",
          "Bạn đã nhập sai quá nhiều lần. Vui lòng gửi mã mới.",
        );
      case "expired":
        throw new AppError(410, "otp_expired", "Mã đã hết hạn. Vui lòng gửi mã mới.");
    }
  }

  async resolveSession(token: string): Promise<AuthUser | null> {
    const [row] = await this.db
      .select({ sessionId: userSessions.id, userId: users.id, email: users.email })
      .from(userSessions)
      .innerJoin(users, eq(users.id, userSessions.userId))
      .where(
        and(
          eq(userSessions.tokenHash, sha256Hex(token)),
          gt(userSessions.expiresAt, sql`now()`),
        ),
      )
      .limit(1);
    return row ?? null;
  }

  async userFromRequest(request: Pick<Request, "headers">): Promise<AuthUser | null> {
    const token = readCookie(request.headers.cookie, USER_COOKIE_NAME);
    return token === null ? null : this.resolveSession(token);
  }

  async endSession(sessionId: string): Promise<void> {
    await this.db.delete(userSessions).where(eq(userSessions.id, sessionId));
  }

  private async enforceLimits(kind: "request" | "verify", ip: string): Promise<void> {
    const limits = AUTH_LIMITS[kind];
    const rules: RateLimitRule[] = [
      {
        key: `auth:${kind}:ip:${this.hashIp(ip)}`,
        limit: limits.perIp,
        windowSeconds: limits.ipWindowSeconds,
      },
      {
        key: `auth:${kind}:day`,
        limit: limits.perDay,
        windowSeconds: AUTH_LIMITS.dayWindowSeconds,
      },
    ];
    const result = await this.rateLimit.hitAll(rules);
    if (!result.allowed) {
      throw new AppError(
        429,
        "rate_limited",
        "Bạn thao tác quá nhanh. Vui lòng thử lại sau ít phút.",
        { retryAfter: result.retryAfter },
      );
    }
  }

  private hashCode(email: string, code: string): string {
    return hmacHex(this.env.SESSION_SECRET, `otp:${email}:${code}`);
  }

  private hashIp(ip: string): string {
    return hmacHex(this.env.SESSION_SECRET, `ip:${ip}`);
  }
}
