import { Controller, Get, HttpStatus, Inject, Query, Req, Res } from "@nestjs/common";
import type { Request, Response } from "express";
import { z } from "zod";

import { AppError } from "../common/app-error.js";
import { parseBody } from "../common/parse-body.js";
import { LOCALES } from "../database/schema/index.js";
import { RateLimitService } from "../rate-limit/rate-limit.service.js";
import { SURVEY_BANK_CACHE_CONTROL, SURVEY_BANK_RATE_LIMIT } from "./question-bank.constants.js";
import { SurveyBankService, type SurveyBankResponse } from "./survey-bank.service.js";

const querySchema = z.object({
  locale: z.enum(LOCALES).default("vi"),
});

function matchesEtag(header: string | undefined, etag: string): boolean {
  if (header === undefined) {
    return false;
  }
  const strip = (value: string): string => value.trim().replace(/^W\//, "");
  const wanted = strip(etag);
  return header.split(",").some((candidate) => candidate.trim() === "*" || strip(candidate) === wanted);
}

@Controller("survey-bank")
export class SurveyBankController {
  constructor(
    @Inject(SurveyBankService) private readonly surveyBank: SurveyBankService,
    @Inject(RateLimitService) private readonly rateLimit: RateLimitService,
  ) {}

  @Get()
  async read(
    @Query() query: unknown,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<SurveyBankResponse | undefined> {
    const { locale } = parseBody(querySchema, query, {
      code: "invalid_locale",
      message: "Ngôn ngữ không được hỗ trợ.",
    });

    const ip = request.ip ?? request.socket.remoteAddress ?? "unknown";
    const limited = await this.rateLimit.hit({
      key: `survey-bank:${ip}`,
      limit: SURVEY_BANK_RATE_LIMIT.limit,
      windowSeconds: SURVEY_BANK_RATE_LIMIT.windowSeconds,
    });
    if (!limited.allowed) {
      throw new AppError(429, "rate_limited", "Bạn thao tác quá nhanh. Vui lòng thử lại sau ít phút.", {
        retryAfter: limited.retryAfter,
      });
    }

    const payload = await this.surveyBank.read(locale);
    response.setHeader("ETag", payload.etag);
    response.setHeader("Cache-Control", SURVEY_BANK_CACHE_CONTROL);
    if (matchesEtag(request.headers["if-none-match"], payload.etag)) {
      response.status(HttpStatus.NOT_MODIFIED);
      return undefined;
    }
    return payload.body;
  }
}
