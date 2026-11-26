import { Body, Controller, Get, Header, Inject, Put, Query, Req, UseGuards } from "@nestjs/common";
import type { StatItem } from "@esg/shared/node";
import type { Request } from "express";

import { AdminSessionGuard, CurrentAdmin, Roles } from "../admin/admin-session.guard.js";
import type { AdminIdentity } from "../admin/admin.types.js";
import { clientIp } from "../common/client-ip.js";
import { enforceRate } from "../common/enforce-rate.js";
import { parseBody } from "../common/parse-body.js";
import { CONTENT_CACHE_CONTROL, CONTENT_READ_RATE_LIMIT } from "../posts/posts.constants.js";
import { localeQuerySchema } from "../posts/posts.schemas.js";
import { RateLimitService } from "../rate-limit/rate-limit.service.js";
import { StatsService, type AdminStats } from "./stats.service.js";

@Controller("stats")
export class StatsController {
  constructor(
    @Inject(StatsService) private readonly stats: StatsService,
    @Inject(RateLimitService) private readonly rateLimit: RateLimitService,
  ) {}

  @Get()
  @Header("Cache-Control", CONTENT_CACHE_CONTROL)
  async read(@Query() query: unknown, @Req() request: Request): Promise<{ items: StatItem[] }> {
    await enforceRate(this.rateLimit, `content:${clientIp(request)}`, CONTENT_READ_RATE_LIMIT);
    const { locale } = parseBody(localeQuerySchema, query, {
      code: "invalid_locale",
      message: "Ngôn ngữ không được hỗ trợ.",
    });
    return this.stats.read(locale);
  }
}

@Controller("admin/stats")
@UseGuards(AdminSessionGuard)
@Roles("content")
export class AdminStatsController {
  constructor(@Inject(StatsService) private readonly stats: StatsService) {}

  @Get()
  @Header("Cache-Control", "private, no-store")
  read(): Promise<AdminStats> {
    return this.stats.current();
  }

  @Put()
  save(
    @Body() body: unknown,
    @CurrentAdmin() admin: AdminIdentity,
    @Req() request: Request,
  ): Promise<AdminStats> {
    return this.stats.save(body, admin, clientIp(request));
  }
}
