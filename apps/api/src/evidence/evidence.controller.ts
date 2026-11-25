import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  Inject,
  Param,
  Post,
  Query,
  Res,
  StreamableFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileFieldsInterceptor } from "@nestjs/platform-express";
import type { Response } from "express";

import type { AuthUser } from "../auth/auth.types.js";
import { CurrentUser, UserSessionGuard } from "../auth/user-session.guard.js";
import { AppError } from "../common/app-error.js";
import { enforceRate } from "../common/enforce-rate.js";
import { parseBody } from "../common/parse-body.js";
import { firstFile, type UploadedFiles as UploadedFileMap } from "../common/uploads.js";
import { FILE_EXTENSIONS, FILE_RULES, type FileMime } from "../files/file-rules.js";
import { RateLimitService } from "../rate-limit/rate-limit.service.js";
import { EVIDENCE_READ_RATE_LIMIT, EVIDENCE_UPLOAD_RATE_LIMIT } from "./evidence.constants.js";
import {
  evidenceIdSchema,
  listEvidenceQuerySchema,
  uploadEvidenceFieldsSchema,
} from "./evidence.schemas.js";
import { EvidenceService, type EvidenceItem } from "./evidence.service.js";

@Controller("evidence")
@UseGuards(UserSessionGuard)
export class EvidenceController {
  constructor(
    @Inject(EvidenceService) private readonly evidence: EvidenceService,
    @Inject(RateLimitService) private readonly rateLimit: RateLimitService,
  ) {}

  @Post()
  @HttpCode(200)
  @Header("Cache-Control", "private, no-store")
  @UseInterceptors(
    FileFieldsInterceptor([{ name: "file", maxCount: 1 }], {
      limits: { fileSize: FILE_RULES.evidence.maxBytes + 1, files: 1, fields: 5, fieldSize: 1000 },
    }),
  )
  async upload(
    @Body() body: unknown,
    @UploadedFiles() files: UploadedFileMap | undefined,
    @CurrentUser() user: AuthUser,
  ): Promise<EvidenceItem> {
    await enforceRate(this.rateLimit, `evidence-upload:${user.userId}`, EVIDENCE_UPLOAD_RATE_LIMIT);
    const fields = parseBody(uploadEvidenceFieldsSchema, body);
    const file = firstFile(files, "file");
    if (file === null) {
      throw new AppError(400, "invalid_file", "Vui lòng chọn một tệp minh chứng.");
    }
    return this.evidence.upload(user, { ...fields, file });
  }

  @Get()
  @Header("Cache-Control", "private, no-store")
  async list(@Query() query: unknown, @CurrentUser() user: AuthUser): Promise<{ evidence: EvidenceItem[] }> {
    await this.limit(user);
    const { reportCode } = parseBody(listEvidenceQuerySchema, query);
    return this.evidence.list(user, reportCode);
  }

  @Get(":id/file")
  async download(
    @Param("id") id: string,
    @CurrentUser() user: AuthUser,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    await this.limit(user);
    const file = await this.evidence.open(user, parseBody(evidenceIdSchema, id));
    const extension = FILE_EXTENSIONS[file.mime as FileMime] ?? "bin";
    const base = (file.originalName ?? "minh-chung").replace(/\.[A-Za-z0-9]+$/, "").replace(/[^\p{L}\p{N}._ -]/gu, "_");
    response.setHeader("Cache-Control", "private, no-store");
    response.setHeader("X-Content-Type-Options", "nosniff");
    return new StreamableFile(file.stream, {
      type: file.mime,
      length: file.size,
      disposition: `attachment; filename*=UTF-8''${encodeURIComponent(`${base.slice(0, 100) || "minh-chung"}.${extension}`)}`,
    });
  }

  @Delete(":id")
  @HttpCode(204)
  async remove(@Param("id") id: string, @CurrentUser() user: AuthUser): Promise<void> {
    await this.limit(user);
    await this.evidence.remove(user, parseBody(evidenceIdSchema, id));
  }

  private limit(user: AuthUser): Promise<void> {
    return enforceRate(this.rateLimit, `evidence-read:${user.userId}`, EVIDENCE_READ_RATE_LIMIT);
  }
}
