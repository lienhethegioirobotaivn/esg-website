import { Body, Controller, Get, Header, HttpCode, Inject, Param, Post, Req } from "@nestjs/common";
import type { Request } from "express";

import { AppError } from "../common/app-error.js";
import { clientIp } from "../common/client-ip.js";
import { enforceRate } from "../common/enforce-rate.js";
import { parseBody } from "../common/parse-body.js";
import { RateLimitService } from "../rate-limit/rate-limit.service.js";
import { FEEDBACK_SUBMIT_RATE_LIMIT, FEEDBACK_TOKEN_RATE_LIMIT } from "./feedback.constants.js";
import {
  directFeedbackSchema,
  feedbackTokenSchema,
  inviteFeedbackSchema,
} from "./feedback.schemas.js";
import { FeedbackService } from "./feedback.service.js";

function validToken(token: string): string {
  const result = feedbackTokenSchema.safeParse(token);
  if (!result.success) {
    throw new AppError(404, "not_found", "Liên kết phản hồi không hợp lệ.");
  }
  return result.data;
}

const INVALID = {
  code: "invalid_feedback",
  message: "Phản hồi chưa hợp lệ. Vui lòng chọn điểm từ 1 đến 5.",
};

@Controller("feedback")
export class FeedbackController {
  constructor(
    @Inject(FeedbackService) private readonly feedback: FeedbackService,
    @Inject(RateLimitService) private readonly rateLimit: RateLimitService,
  ) {}

  @Post()
  @HttpCode(201)
  async submitDirect(@Body() body: unknown, @Req() request: Request): Promise<{ code: string }> {
    await enforceRate(this.rateLimit, `feedback:${clientIp(request)}`, FEEDBACK_SUBMIT_RATE_LIMIT);
    return this.feedback.submitDirect(parseBody(directFeedbackSchema, body, INVALID));
  }

  @Get("invite/:token")
  @Header("Cache-Control", "private, no-store")
  async inspectInvite(
    @Param("token") token: string,
    @Req() request: Request,
  ): Promise<{ reportCode: string | null }> {
    await enforceRate(this.rateLimit, `feedback-token:${clientIp(request)}`, FEEDBACK_TOKEN_RATE_LIMIT);
    return this.feedback.inspectInvite(
      validToken(token),
    );
  }

  @Post("invite/:token")
  @HttpCode(200)
  @Header("Cache-Control", "private, no-store")
  async submitInvite(
    @Param("token") token: string,
    @Body() body: unknown,
    @Req() request: Request,
  ): Promise<{ code: string | null }> {
    await enforceRate(this.rateLimit, `feedback-token:${clientIp(request)}`, FEEDBACK_TOKEN_RATE_LIMIT);
    return this.feedback.submitInvite(
      validToken(token),
      parseBody(inviteFeedbackSchema, body, INVALID),
    );
  }
}
