import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  Inject,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import type { Request } from "express";

import { AdminSessionGuard, CurrentAdmin, Roles } from "../admin/admin-session.guard.js";
import type { AdminIdentity } from "../admin/admin.types.js";
import { AuditService } from "../audit/audit.service.js";
import { AppError } from "../common/app-error.js";
import { clientIp } from "../common/client-ip.js";
import { enforceRate } from "../common/enforce-rate.js";
import { parseBody } from "../common/parse-body.js";
import { RateLimitService } from "../rate-limit/rate-limit.service.js";
import { TranslationAdminService, type AdminTranslationList } from "./translation-admin.service.js";
import { TRANSLATION_ADMIN_BUDGET_MS, TRANSLATION_RUN_RATE_LIMIT } from "./translation.constants.js";
import {
  adminTranslationsQuerySchema,
  manualTranslationsSchema,
  translationRunSchema,
} from "./translation.schemas.js";
import {
  TranslationService,
  type TranslationPruneResult,
  type TranslationRunResult,
} from "./translation.service.js";

function busy(): AppError {
  return new AppError(
    409,
    "translation_running",
    "Đang có một lượt dịch khác chạy. Vui lòng thử lại sau ít phút.",
  );
}

@Controller("admin/translations")
@UseGuards(AdminSessionGuard)
@Roles("content")
export class AdminTranslationsController {
  constructor(
    @Inject(TranslationAdminService) private readonly admin: TranslationAdminService,
    @Inject(TranslationService) private readonly translation: TranslationService,
    @Inject(RateLimitService) private readonly rateLimit: RateLimitService,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  @Get()
  @Header("Cache-Control", "private, no-store")
  async list(@Query() query: unknown): Promise<AdminTranslationList & { configured: boolean }> {
    const result = await this.admin.list(parseBody(adminTranslationsQuerySchema, query));
    return { ...result, configured: this.translation.configured };
  }

  @Put()
  async update(
    @Body() body: unknown,
    @CurrentAdmin() actor: AdminIdentity,
    @Req() request: Request,
  ): Promise<{ updated: number }> {
    const input = parseBody(manualTranslationsSchema, body);
    return { updated: await this.admin.setManual(input, actor, clientIp(request)) };
  }

  @Post("run")
  @HttpCode(200)
  async run(
    @Body() body: unknown,
    @CurrentAdmin() actor: AdminIdentity,
    @Req() request: Request,
  ): Promise<TranslationRunResult | TranslationPruneResult> {
    const input = parseBody(translationRunSchema, body ?? {});
    await enforceRate(this.rateLimit, `translation:run:${actor.adminId}`, TRANSLATION_RUN_RATE_LIMIT);
    const result = input.prune
      ? await this.translation.prune(0)
      : await this.translation.run({
          budgetMs: TRANSLATION_ADMIN_BUDGET_MS,
          retryFailed: input.retryFailed,
          ...(input.locale === undefined ? {} : { locales: [input.locale] }),
        });
    if (result === null) {
      throw busy();
    }
    await this.audit.record({
      actorType: "admin",
      actorId: actor.adminId,
      action: input.prune ? "translation.prune" : "translation.run",
      entity: "translation",
      entityId: input.locale ?? null,
      meta: { ...result },
      ip: clientIp(request),
    });
    return result;
  }
}
