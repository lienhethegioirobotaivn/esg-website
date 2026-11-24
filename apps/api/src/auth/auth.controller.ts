import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  Inject,
  Post,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import type { Request, Response } from "express";

import { APP_ENV } from "../config/config.constants.js";
import type { AppEnv } from "../config/env.schema.js";
import { parseBody } from "../common/parse-body.js";
import { USER_COOKIE_NAME } from "./auth.constants.js";
import { emailOtpRequestSchema, emailOtpVerifySchema } from "./auth.schemas.js";
import { AuthService, type RequestOtpResult } from "./auth.service.js";
import type { AuthUser } from "./auth.types.js";
import { clearCookieOptions, readCookie, sessionCookieOptions } from "./cookies.js";
import { CurrentUser, UserSessionGuard } from "./user-session.guard.js";

@Controller("auth")
export class AuthController {
  constructor(
    @Inject(AuthService) private readonly auth: AuthService,
    @Inject(APP_ENV) private readonly env: AppEnv,
  ) {}

  @Post("email/request")
  @HttpCode(200)
  @Header("Cache-Control", "private, no-store")
  requestEmail(@Body() body: unknown, @Req() request: Request): Promise<RequestOtpResult> {
    const input = parseBody(emailOtpRequestSchema, body, {
      code: "invalid_email",
      message: "Email chưa hợp lệ. Vui lòng kiểm tra lại.",
    });
    return this.auth.requestOtp({ ...input, ip: clientIp(request) });
  }

  @Post("email/verify")
  @HttpCode(200)
  @Header("Cache-Control", "private, no-store")
  async verifyEmail(
    @Body() body: unknown,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ email: string }> {
    const input = parseBody(emailOtpVerifySchema, body);
    const result = await this.auth.verifyOtp({
      ...input,
      ip: clientIp(request),
      userAgent: request.headers["user-agent"],
    });
    response.cookie(USER_COOKIE_NAME, result.token, sessionCookieOptions(this.isSecure()));
    return { email: result.email };
  }

  @Get("me")
  @Header("Cache-Control", "private, no-store")
  async me(@Req() request: Request): Promise<{ email: string | null }> {
    const token = readCookie(request.headers.cookie, USER_COOKIE_NAME);
    const user = token === null ? null : await this.auth.resolveSession(token);
    return { email: user?.email ?? null };
  }

  @Post("logout")
  @HttpCode(204)
  @UseGuards(UserSessionGuard)
  async logout(
    @CurrentUser() user: AuthUser,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    await this.auth.endSession(user.sessionId);
    response.clearCookie(USER_COOKIE_NAME, clearCookieOptions(this.isSecure()));
  }

  private isSecure(): boolean {
    return this.env.NODE_ENV === "production";
  }
}

function clientIp(request: Request): string {
  return request.ip ?? request.socket.remoteAddress ?? "unknown";
}
