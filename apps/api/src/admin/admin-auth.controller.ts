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

import { clearCookieOptions } from "../auth/cookies.js";
import { clientIp } from "../common/client-ip.js";
import { parseBody } from "../common/parse-body.js";
import { APP_ENV } from "../config/config.constants.js";
import type { AppEnv } from "../config/env.schema.js";
import { ADMIN_COOKIE_NAME, ADMIN_SESSION_MAX_AGE_MS } from "./admin.constants.js";
import { AdminAuthService } from "./admin-auth.service.js";
import { AdminSessionGuard, CurrentAdmin } from "./admin-session.guard.js";
import { adminLoginSchema } from "./admin.schemas.js";
import type { AdminIdentity } from "./admin.types.js";

@Controller("admin")
export class AdminAuthController {
  constructor(
    @Inject(AdminAuthService) private readonly auth: AdminAuthService,
    @Inject(APP_ENV) private readonly env: AppEnv,
  ) {}

  @Post("login")
  @HttpCode(200)
  @Header("Cache-Control", "private, no-store")
  async login(
    @Body() body: unknown,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ email: string; name: string; role: string }> {
    const input = parseBody(adminLoginSchema, body, {
      code: "invalid_credentials",
      message: "Email hoặc mật khẩu không đúng.",
    });
    const result = await this.auth.login({
      ...input,
      ip: clientIp(request),
      userAgent: request.headers["user-agent"],
    });
    response.cookie(ADMIN_COOKIE_NAME, result.token, {
      httpOnly: true,
      sameSite: "lax",
      secure: this.env.NODE_ENV === "production",
      path: "/",
      maxAge: ADMIN_SESSION_MAX_AGE_MS,
    });
    return result.admin;
  }

  @Get("me")
  @UseGuards(AdminSessionGuard)
  @Header("Cache-Control", "private, no-store")
  me(@CurrentAdmin() admin: AdminIdentity): { email: string; name: string; role: string } {
    return { email: admin.email, name: admin.name, role: admin.role };
  }

  @Post("logout")
  @HttpCode(204)
  @UseGuards(AdminSessionGuard)
  async logout(
    @CurrentAdmin() admin: AdminIdentity,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    await this.auth.logout(admin, clientIp(request));
    response.clearCookie(ADMIN_COOKIE_NAME, clearCookieOptions(this.env.NODE_ENV === "production"));
  }
}
