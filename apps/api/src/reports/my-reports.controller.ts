import type { MyReport } from "@esg/shared/node";
import {
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  Inject,
  Param,
  Res,
  StreamableFile,
  UseGuards,
} from "@nestjs/common";
import type { Response } from "express";

import type { AuthUser } from "../auth/auth.types.js";
import { CurrentUser, UserSessionGuard } from "../auth/user-session.guard.js";
import { enforceRate } from "../common/enforce-rate.js";
import { parseBody } from "../common/parse-body.js";
import { FILE_EXTENSIONS, type FileMime } from "../files/file-rules.js";
import { RateLimitService } from "../rate-limit/rate-limit.service.js";
import { OWNER_ACTION_RATE_LIMIT } from "./reports.constants.js";
import { exportIdParamSchema, formatParamSchema } from "./reports.schemas.js";
import { ReportsService } from "./reports.service.js";

function downloadName(reportCode: string, mime: string, original: string | null): string {
  const extension = FILE_EXTENSIONS[mime as FileMime] ?? "bin";
  const base = (original ?? reportCode).replace(/\.[A-Za-z0-9]+$/, "").replace(/[^\p{L}\p{N}._ -]/gu, "_");
  return `${base.slice(0, 100) || reportCode}.${extension}`;
}

@Controller("my-reports")
@UseGuards(UserSessionGuard)
export class MyReportsController {
  constructor(
    @Inject(ReportsService) private readonly reports: ReportsService,
    @Inject(RateLimitService) private readonly rateLimit: RateLimitService,
  ) {}

  @Get()
  @Header("Cache-Control", "private, no-store")
  async list(@CurrentUser() user: AuthUser): Promise<{ reports: MyReport[] }> {
    await enforceRate(this.rateLimit, `owner:${user.userId}`, OWNER_ACTION_RATE_LIMIT);
    return this.reports.listMine(user);
  }

  @Get(":exportId/snapshot")
  @Header("Cache-Control", "private, no-store")
  async snapshot(
    @Param("exportId") exportId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<{ snapshot: unknown; reportCode: string }> {
    await enforceRate(this.rateLimit, `owner:${user.userId}`, OWNER_ACTION_RATE_LIMIT);
    return this.reports.snapshotOf(parseBody(exportIdParamSchema, exportId), user);
  }

  @Get(":exportId/files/:format")
  async download(
    @Param("exportId") exportId: string,
    @Param("format") format: string,
    @CurrentUser() user: AuthUser,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    await enforceRate(this.rateLimit, `owner:${user.userId}`, OWNER_ACTION_RATE_LIMIT);
    const id = parseBody(exportIdParamSchema, exportId);
    const kind = parseBody(formatParamSchema, format);
    const file = await this.reports.fileOf(id, kind, user);
    const name = downloadName(id, file.mime, file.originalName);
    response.setHeader("Cache-Control", "private, no-store");
    response.setHeader("X-Content-Type-Options", "nosniff");
    return new StreamableFile(file.stream, {
      type: file.mime,
      length: file.size,
      disposition: `attachment; filename*=UTF-8''${encodeURIComponent(name)}`,
    });
  }

  @Delete(":exportId")
  @HttpCode(204)
  async remove(@Param("exportId") exportId: string, @CurrentUser() user: AuthUser): Promise<void> {
    await enforceRate(this.rateLimit, `owner:${user.userId}`, OWNER_ACTION_RATE_LIMIT);
    await this.reports.deleteExport(parseBody(exportIdParamSchema, exportId), user);
  }
}
