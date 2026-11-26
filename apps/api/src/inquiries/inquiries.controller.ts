import { Body, Controller, HttpCode, Inject, Post, Req } from "@nestjs/common";
import type { Request } from "express";

import { clientIp } from "../common/client-ip.js";
import { enforceRate } from "../common/enforce-rate.js";
import { parseBody } from "../common/parse-body.js";
import { RateLimitService } from "../rate-limit/rate-limit.service.js";
import { INQUIRY_RATE_LIMIT } from "./inquiries.constants.js";
import { createInquirySchema } from "./inquiries.schemas.js";
import { InquiriesService } from "./inquiries.service.js";

@Controller("inquiries")
export class InquiriesController {
  constructor(
    @Inject(InquiriesService) private readonly inquiries: InquiriesService,
    @Inject(RateLimitService) private readonly rateLimit: RateLimitService,
  ) {}

  @Post()
  @HttpCode(201)
  async create(@Body() body: unknown, @Req() request: Request): Promise<{ code: string }> {
    const ip = clientIp(request);
    await enforceRate(this.rateLimit, `inquiry:${ip}`, INQUIRY_RATE_LIMIT);
    const input = parseBody(createInquirySchema, body, {
      code: "invalid_inquiry",
      message: "Thông tin yêu cầu chưa hợp lệ. Vui lòng kiểm tra lại và để lại ít nhất email hoặc số điện thoại.",
    });
    return this.inquiries.create(input, ip);
  }
}
