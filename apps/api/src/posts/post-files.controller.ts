import { Controller, Get, HttpStatus, Inject, Param, Req, Res, StreamableFile } from "@nestjs/common";
import type { Request, Response } from "express";

import { uuidParamSchema } from "../admin/admin.schemas.js";
import { AppError } from "../common/app-error.js";
import { PostImagesService } from "./post-images.service.js";
import { POST_IMAGE_CACHE_CONTROL } from "./posts.constants.js";

@Controller("files")
export class PostFilesController {
  constructor(@Inject(PostImagesService) private readonly images: PostImagesService) {}

  @Get(":id")
  async read(
    @Param("id") id: string,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile | undefined> {
    const parsed = uuidParamSchema.safeParse(id);
    const file = parsed.success ? await this.images.open(parsed.data) : null;
    if (file === null) {
      throw new AppError(404, "file_not_found", "Không tìm thấy tệp.");
    }
    const etag = `"${file.sha256.slice(0, 32)}"`;
    response.setHeader("ETag", etag);
    response.setHeader("Cache-Control", POST_IMAGE_CACHE_CONTROL);
    response.setHeader("X-Content-Type-Options", "nosniff");
    if (request.headers["if-none-match"] === etag) {
      file.stream.destroy();
      response.status(HttpStatus.NOT_MODIFIED);
      return undefined;
    }
    return new StreamableFile(file.stream, { type: file.mime, length: file.size, disposition: "inline" });
  }
}
