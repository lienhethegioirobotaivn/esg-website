import {
  Controller,
  HttpCode,
  Inject,
  Post,
  Req,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileFieldsInterceptor } from "@nestjs/platform-express";
import { postImagePath } from "@esg/shared/node";
import type { Request } from "express";

import { AdminSessionGuard, CurrentAdmin, Roles } from "../admin/admin-session.guard.js";
import type { AdminIdentity } from "../admin/admin.types.js";
import { AuditService } from "../audit/audit.service.js";
import { AppError } from "../common/app-error.js";
import { clientIp } from "../common/client-ip.js";
import { enforceRate } from "../common/enforce-rate.js";
import { firstFile, type UploadedFiles as UploadedFileMap } from "../common/uploads.js";
import { FILE_RULES } from "../files/file-rules.js";
import { FilesService } from "../files/files.service.js";
import { RateLimitService } from "../rate-limit/rate-limit.service.js";
import { POST_IMAGE_UPLOAD_RATE_LIMIT } from "./posts.constants.js";

@Controller("admin/upload")
@UseGuards(AdminSessionGuard)
@Roles("content")
export class AdminUploadController {
  constructor(
    @Inject(FilesService) private readonly files: FilesService,
    @Inject(RateLimitService) private readonly rateLimit: RateLimitService,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  @Post()
  @HttpCode(201)
  @UseInterceptors(
    FileFieldsInterceptor([{ name: "image", maxCount: 1 }], {
      limits: { fileSize: FILE_RULES.post_image.maxBytes + 1, files: 1, fields: 2, fieldSize: 1000 },
    }),
  )
  async upload(
    @UploadedFiles() uploads: UploadedFileMap | undefined,
    @CurrentAdmin() admin: AdminIdentity,
    @Req() request: Request,
  ): Promise<{ id: string; url: string }> {
    await enforceRate(this.rateLimit, `post-image:${admin.adminId}`, POST_IMAGE_UPLOAD_RATE_LIMIT);
    const file = firstFile(uploads, "image");
    if (file === null) {
      throw new AppError(400, "invalid_file", "Vui lòng chọn một ảnh.");
    }
    const stored = await this.files.upload({
      buffer: file.buffer,
      kind: "post_image",
      ownerUserId: null,
      originalName: file.originalname,
    });
    await this.audit.record({
      actorType: "admin",
      actorId: admin.adminId,
      action: "post.image_upload",
      entity: "file",
      entityId: stored.id,
      meta: { size: stored.size, mime: stored.mime },
      ip: clientIp(request),
    });
    return { id: stored.id, url: postImagePath(stored.id) };
  }
}
