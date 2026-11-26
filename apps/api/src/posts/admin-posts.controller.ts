import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import type { Request } from "express";

import { AdminSessionGuard, CurrentAdmin, Roles } from "../admin/admin-session.guard.js";
import type { AdminIdentity } from "../admin/admin.types.js";
import { uuidParamSchema } from "../admin/admin.schemas.js";
import { clientIp } from "../common/client-ip.js";
import { parseBody } from "../common/parse-body.js";
import type { PostDetail } from "./post-view.js";
import { adminPostsQuerySchema, postPatchSchema } from "./posts.schemas.js";
import { PostsService, type AdminPostList } from "./posts.service.js";

@Controller("admin/posts")
@UseGuards(AdminSessionGuard)
@Roles("content")
export class AdminPostsController {
  constructor(@Inject(PostsService) private readonly posts: PostsService) {}

  @Get()
  @Header("Cache-Control", "private, no-store")
  list(@Query() query: unknown): Promise<AdminPostList> {
    return this.posts.list(parseBody(adminPostsQuerySchema, query));
  }

  @Get(":id")
  @Header("Cache-Control", "private, no-store")
  detail(@Param("id") id: string): Promise<PostDetail> {
    return this.posts.detail(parseBody(uuidParamSchema, id));
  }

  @Post()
  @HttpCode(201)
  create(
    @Body() body: unknown,
    @CurrentAdmin() admin: AdminIdentity,
    @Req() request: Request,
  ): Promise<PostDetail> {
    return this.posts.create(body, admin, clientIp(request));
  }

  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body() body: unknown,
    @CurrentAdmin() admin: AdminIdentity,
    @Req() request: Request,
  ): Promise<PostDetail> {
    return this.posts.update(
      parseBody(uuidParamSchema, id),
      parseBody(postPatchSchema, body),
      admin,
      clientIp(request),
    );
  }

  @Delete(":id")
  @HttpCode(204)
  remove(
    @Param("id") id: string,
    @CurrentAdmin() admin: AdminIdentity,
    @Req() request: Request,
  ): Promise<void> {
    return this.posts.remove(parseBody(uuidParamSchema, id), admin, clientIp(request));
  }
}
