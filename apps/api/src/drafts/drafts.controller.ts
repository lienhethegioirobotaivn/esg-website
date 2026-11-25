import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  Inject,
  Put,
  Query,
  UseGuards,
} from "@nestjs/common";

import type { AuthUser } from "../auth/auth.types.js";
import { CurrentUser, UserSessionGuard } from "../auth/user-session.guard.js";
import { enforceRate } from "../common/enforce-rate.js";
import { parseBody } from "../common/parse-body.js";
import { RateLimitService } from "../rate-limit/rate-limit.service.js";
import { DRAFT_RATE_LIMIT } from "./drafts.constants.js";
import { draftQuerySchema, putDraftSchema } from "./drafts.schemas.js";
import { DraftsService, type DraftView } from "./drafts.service.js";

@Controller("drafts")
@UseGuards(UserSessionGuard)
export class DraftsController {
  constructor(
    @Inject(DraftsService) private readonly drafts: DraftsService,
    @Inject(RateLimitService) private readonly rateLimit: RateLimitService,
  ) {}

  @Get()
  @Header("Cache-Control", "private, no-store")
  async read(@Query() query: unknown, @CurrentUser() user: AuthUser): Promise<{ draft: DraftView | null }> {
    await this.limit(user);
    const { reportCode } = parseBody(draftQuerySchema, query);
    return { draft: await this.drafts.read(user, reportCode ?? null) };
  }

  @Put()
  @HttpCode(200)
  @Header("Cache-Control", "private, no-store")
  async write(@Body() body: unknown, @CurrentUser() user: AuthUser): Promise<{ updatedAt: string }> {
    await this.limit(user);
    return this.drafts.write(user, parseBody(putDraftSchema, body, { code: "invalid_draft", message: "Bản nháp không hợp lệ hoặc quá lớn." }));
  }

  @Delete()
  @HttpCode(204)
  async remove(@Query() query: unknown, @CurrentUser() user: AuthUser): Promise<void> {
    await this.limit(user);
    const { reportCode } = parseBody(draftQuerySchema, query);
    await this.drafts.remove(user, reportCode ?? null);
  }

  private limit(user: AuthUser): Promise<void> {
    return enforceRate(this.rateLimit, `draft:${user.userId}`, DRAFT_RATE_LIMIT);
  }
}
