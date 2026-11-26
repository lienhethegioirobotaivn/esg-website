import { Controller, Delete, Get, Header, HttpCode, Inject, Param, Post, Query, Req, Res } from "@nestjs/common";
import type { Request, Response } from "express";

import { newSessionToken } from "../auth/crypto.js";
import { AppError } from "../common/app-error.js";
import { clientIp } from "../common/client-ip.js";
import { enforceRate } from "../common/enforce-rate.js";
import { parseBody } from "../common/parse-body.js";
import { APP_ENV } from "../config/config.constants.js";
import type { AppEnv } from "../config/env.schema.js";
import { RateLimitService } from "../rate-limit/rate-limit.service.js";
import { uuidParamSchema } from "../admin/admin.schemas.js";
import { PostLikesService, type LikeState } from "./post-likes.service.js";
import type { PostDetail } from "./post-view.js";
import {
  CONTENT_CACHE_CONTROL,
  CONTENT_READ_RATE_LIMIT,
  LIKE_IP_POST_RATE_LIMIT,
  LIKE_IP_RATE_LIMIT,
  VIEWER_COOKIE_MAX_AGE_MS,
  VIEWER_COOKIE_NAME,
} from "./posts.constants.js";
import { localeQuerySchema, publicPostParamsSchema, publicPostsQuerySchema } from "./posts.schemas.js";
import { PostsService, type PostList } from "./posts.service.js";
import { readViewerToken } from "./viewer-cookie.js";

const INVALID_LOCALE = { code: "invalid_locale", message: "Ngôn ngữ không được hỗ trợ." };

@Controller("posts")
export class PostsController {
  constructor(
    @Inject(PostsService) private readonly posts: PostsService,
    @Inject(PostLikesService) private readonly likes: PostLikesService,
    @Inject(RateLimitService) private readonly rateLimit: RateLimitService,
    @Inject(APP_ENV) private readonly env: AppEnv,
  ) {}

  @Get()
  @Header("Cache-Control", CONTENT_CACHE_CONTROL)
  async list(@Query() query: unknown, @Req() request: Request): Promise<PostList> {
    await this.limitRead(request);
    const { locale } = parseBody(localeQuerySchema, query, INVALID_LOCALE);
    return this.posts.listPublished(parseBody(publicPostsQuerySchema, query), locale);
  }

  @Get(":section/:slug")
  @Header("Cache-Control", CONTENT_CACHE_CONTROL)
  async read(
    @Param() params: unknown,
    @Query() query: unknown,
    @Req() request: Request,
  ): Promise<PostDetail> {
    await this.limitRead(request);
    const { locale } = parseBody(localeQuerySchema, query, INVALID_LOCALE);
    const parsed = publicPostParamsSchema.safeParse(params);
    if (!parsed.success) {
      throw new AppError(404, "post_not_found", "Không tìm thấy bài viết.");
    }
    return this.posts.readPublished(parsed.data.section, parsed.data.slug, locale);
  }

  @Post(":id/like")
  @HttpCode(200)
  @Header("Cache-Control", "private, no-store")
  async like(
    @Param("id") id: string,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<LikeState> {
    const postId = parseBody(uuidParamSchema, id);
    const ip = clientIp(request);
    await enforceRate(this.rateLimit, `like:ip:${ip}`, LIKE_IP_RATE_LIMIT);
    await enforceRate(this.rateLimit, `like:post:${postId}:${ip}`, LIKE_IP_POST_RATE_LIMIT);
    const token = readViewerToken(request.headers.cookie) ?? newSessionToken();
    const state = await this.likes.like(postId, token);
    response.cookie(VIEWER_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: this.env.NODE_ENV === "production",
      path: "/",
      maxAge: VIEWER_COOKIE_MAX_AGE_MS,
    });
    return state;
  }

  @Delete(":id/like")
  @Header("Cache-Control", "private, no-store")
  async unlike(@Param("id") id: string, @Req() request: Request): Promise<LikeState> {
    const postId = parseBody(uuidParamSchema, id);
    await enforceRate(this.rateLimit, `like:ip:${clientIp(request)}`, LIKE_IP_RATE_LIMIT);
    return this.likes.unlike(postId, readViewerToken(request.headers.cookie));
  }

  private limitRead(request: Request): Promise<void> {
    return enforceRate(this.rateLimit, `content:${clientIp(request)}`, CONTENT_READ_RATE_LIMIT);
  }
}
