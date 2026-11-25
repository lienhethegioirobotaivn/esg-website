import {
  Body,
  Controller,
  Header,
  HttpCode,
  Inject,
  Post,
  Req,
  UploadedFiles,
  UseInterceptors,
} from "@nestjs/common";
import { FileFieldsInterceptor } from "@nestjs/platform-express";
import type { Request } from "express";

import { AuthService } from "../auth/auth.service.js";
import { clientIp } from "../common/client-ip.js";
import { enforceRate } from "../common/enforce-rate.js";
import { firstFile, type UploadedFiles as UploadedFileMap } from "../common/uploads.js";
import { FILE_RULES } from "../files/file-rules.js";
import { RateLimitService } from "../rate-limit/rate-limit.service.js";
import { COMPANY_RATE_LIMIT, MAX_COMPANY_FIELD_BYTES } from "./companies.constants.js";
import { CompaniesService, type SaveCompanyResult } from "./companies.service.js";
import { parseCompanyForm } from "./company-mapper.js";

@Controller("companies")
export class CompaniesController {
  constructor(
    @Inject(CompaniesService) private readonly companies: CompaniesService,
    @Inject(AuthService) private readonly auth: AuthService,
    @Inject(RateLimitService) private readonly rateLimit: RateLimitService,
  ) {}

  @Post()
  @HttpCode(200)
  @Header("Cache-Control", "private, no-store")
  @UseInterceptors(
    FileFieldsInterceptor([{ name: "logo", maxCount: 1 }], {
      limits: {
        fileSize: FILE_RULES.logo.maxBytes + 1,
        files: 1,
        fields: 30,
        fieldSize: MAX_COMPANY_FIELD_BYTES,
      },
    }),
  )
  async save(
    @Body() body: unknown,
    @UploadedFiles() files: UploadedFileMap | undefined,
    @Req() request: Request,
  ): Promise<SaveCompanyResult> {
    await enforceRate(this.rateLimit, `company:${clientIp(request)}`, COMPANY_RATE_LIMIT);
    const form = parseCompanyForm(body);
    const user = await this.auth.userFromRequest(request);
    return this.companies.save({ form, logo: firstFile(files, "logo"), user });
  }
}
