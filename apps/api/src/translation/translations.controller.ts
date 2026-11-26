import { Controller, Get, Header, Inject, Query, Req } from "@nestjs/common";
import type { Request } from "express";

import { clientIp } from "../common/client-ip.js";
import { enforceRate } from "../common/enforce-rate.js";
import { parseBody } from "../common/parse-body.js";
import type { TranslationLocale } from "../database/schema/index.js";
import { CONTENT_CACHE_CONTROL, CONTENT_READ_RATE_LIMIT } from "../posts/posts.constants.js";
import { RateLimitService } from "../rate-limit/rate-limit.service.js";
import { TranslationMemoryService } from "./translation-memory.service.js";
import { translationLocaleQuerySchema } from "./translation.schemas.js";

export interface TranslationDictionary {
  locale: TranslationLocale;
  items: Record<string, string>;
}

@Controller("translations")
export class TranslationsController {
  constructor(
    @Inject(TranslationMemoryService) private readonly memory: TranslationMemoryService,
    @Inject(RateLimitService) private readonly rateLimit: RateLimitService,
  ) {}

  @Get()
  @Header("Cache-Control", CONTENT_CACHE_CONTROL)
  async read(@Query() query: unknown, @Req() request: Request): Promise<TranslationDictionary> {
    await enforceRate(this.rateLimit, `content:${clientIp(request)}`, CONTENT_READ_RATE_LIMIT);
    const { locale } = parseBody(translationLocaleQuerySchema, query, {
      code: "invalid_locale",
      message: "Ngôn ngữ không được hỗ trợ.",
    });
    return { locale, items: await this.memory.dictionary(locale) };
  }
}
