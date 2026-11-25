import { REPORT_ARCHIVE_LIMITS } from "@esg/shared/node";
import {
  Body,
  Controller,
  Header,
  HttpCode,
  Inject,
  Param,
  Post,
  Req,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileFieldsInterceptor } from "@nestjs/platform-express";
import type { Request } from "express";

import { AuthService } from "../auth/auth.service.js";
import type { AuthUser } from "../auth/auth.types.js";
import { CurrentUser, UserSessionGuard } from "../auth/user-session.guard.js";
import { clientIp } from "../common/client-ip.js";
import { enforceRate } from "../common/enforce-rate.js";
import { parseBody } from "../common/parse-body.js";
import { firstFile, type UploadedFiles as UploadedFileMap } from "../common/uploads.js";
import { FILE_RULES } from "../files/file-rules.js";
import { RateLimitService } from "../rate-limit/rate-limit.service.js";
import { EXPORT_RATE_LIMIT, OWNER_ACTION_RATE_LIMIT } from "./reports.constants.js";
import {
  attachBodySchema,
  claimBodySchema,
  exportFieldsSchema,
  exportIdParamSchema,
} from "./reports.schemas.js";
import { ReportsService, type CreateExportResult, type OwnerLinkStatus } from "./reports.service.js";

@Controller("reports")
export class ReportsController {
  constructor(
    @Inject(ReportsService) private readonly reports: ReportsService,
    @Inject(AuthService) private readonly auth: AuthService,
    @Inject(RateLimitService) private readonly rateLimit: RateLimitService,
  ) {}

  @Post("exports")
  @HttpCode(200)
  @Header("Cache-Control", "private, no-store")
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: "pdf", maxCount: 1 },
        { name: "docx", maxCount: 1 },
      ],
      {
        limits: {
          fileSize: Math.max(FILE_RULES.export_pdf.maxBytes, FILE_RULES.export_docx.maxBytes) + 1,
          files: 2,
          fields: 10,
          fieldSize: REPORT_ARCHIVE_LIMITS.maxSnapshotChars + 1000,
        },
      },
    ),
  )
  async createExport(
    @Body() body: unknown,
    @UploadedFiles() files: UploadedFileMap | undefined,
    @Req() request: Request,
  ): Promise<CreateExportResult> {
    await enforceRate(this.rateLimit, `export:${clientIp(request)}`, EXPORT_RATE_LIMIT);
    const fields = parseBody(exportFieldsSchema, body);
    const user = await this.auth.userFromRequest(request);
    return this.reports.createExport({
      fields,
      pdf: firstFile(files, "pdf"),
      docx: firstFile(files, "docx"),
      user,
    });
  }

  @Post("exports/:exportId/attach")
  @HttpCode(200)
  @UseGuards(UserSessionGuard)
  @Header("Cache-Control", "private, no-store")
  async attach(
    @Param("exportId") exportId: string,
    @Body() body: unknown,
    @CurrentUser() user: AuthUser,
  ): Promise<{ status: OwnerLinkStatus }> {
    await enforceRate(this.rateLimit, `owner:${user.userId}`, OWNER_ACTION_RATE_LIMIT);
    const id = parseBody(exportIdParamSchema, exportId);
    const { attachToken } = parseBody(attachBodySchema, body);
    return { status: await this.reports.attach(id, attachToken, user) };
  }

  @Post("claim")
  @HttpCode(200)
  @UseGuards(UserSessionGuard)
  @Header("Cache-Control", "private, no-store")
  async claim(
    @Body() body: unknown,
    @CurrentUser() user: AuthUser,
  ): Promise<{ status: OwnerLinkStatus }> {
    await enforceRate(this.rateLimit, `owner:${user.userId}`, OWNER_ACTION_RATE_LIMIT);
    const { reportCode, claimToken } = parseBody(claimBodySchema, body);
    return { status: await this.reports.claim(reportCode, claimToken, user) };
  }
}
