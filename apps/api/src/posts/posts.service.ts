import { Inject, Injectable } from "@nestjs/common";
import { flattenIssues, postImageId, postInputSchema, type PostInput } from "@esg/shared/node";
import { and, count, desc, eq, ilike, or, type SQL } from "drizzle-orm";

import type { AdminIdentity } from "../admin/admin.types.js";
import { AuditService } from "../audit/audit.service.js";
import { AppError } from "../common/app-error.js";
import { isUniqueViolation } from "../common/db-errors.js";
import { escapeLike } from "../common/pagination.js";
import type { Database } from "../database/client.js";
import { DATABASE } from "../database/database.constants.js";
import { posts, type Locale } from "../database/schema/index.js";
import { applyRichTexts, collectRichTexts } from "../translation/rich-texts.js";
import { TranslationMemoryService } from "../translation/translation-memory.service.js";
import { collectPostImageRefs } from "./post-image-refs.js";
import { PostImagesService, type Transaction } from "./post-images.service.js";
import {
  detailColumns,
  summaryColumns,
  toDetail,
  toSummary,
  type PostDetail,
  type PostSummary,
} from "./post-view.js";
import type { AdminPostsQuery, PublicPostsQuery } from "./posts.schemas.js";
import { parsePublishDate } from "./publish-date.js";

export interface PostList {
  posts: PostSummary[];
  total: number;
}

export interface AdminPostList {
  posts: (PostSummary & { updatedAt: string })[];
  total: number;
}

const newestFirst = [desc(posts.publishedAt), desc(posts.createdAt), desc(posts.id)];

function invalidPost(fields: Record<string, string>): AppError {
  return new AppError(
    400,
    "invalid_post",
    "Dữ liệu chưa hợp lệ. Vui lòng kiểm tra các mục được đánh dấu.",
    { fields },
  );
}

function parseInput(raw: unknown): PostInput & { publishDate: Date } {
  const result = postInputSchema.safeParse(raw);
  if (!result.success) {
    throw invalidPost(flattenIssues(result.error));
  }
  const publishDate = parsePublishDate(result.data.publishedAt);
  if (publishDate === null) {
    throw invalidPost({ publishedAt: "Ngày đăng không hợp lệ" });
  }
  return { ...result.data, publishDate };
}

function columnsFrom(input: PostInput & { publishDate: Date }) {
  const coverFileId = postImageId(input.coverUrl);
  return {
    section: input.section,
    slug: input.slug,
    category: input.category,
    title: input.title,
    excerpt: input.summary,
    body: { ...input.body },
    coverFileId,
    coverUrl: coverFileId !== null || input.coverUrl === "" ? null : input.coverUrl,
    authorName: input.author,
    readMinutes: input.readMinutes,
    publishedAt: input.publishDate,
    featured: input.featured,
    popular: input.popular,
    spotlight: input.spotlight,
    status: input.status,
  };
}

function slugTaken(error: unknown): unknown {
  if (!isUniqueViolation(error)) {
    return error;
  }
  const message = "Đường dẫn (slug) này đã tồn tại trong mục đã chọn.";
  return new AppError(409, "slug_taken", message, { fields: { slug: message } });
}

function postNotFound(): AppError {
  return new AppError(404, "post_not_found", "Không tìm thấy bài viết.");
}

@Injectable()
export class PostsService {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    @Inject(PostImagesService) private readonly images: PostImagesService,
    @Inject(TranslationMemoryService) private readonly memory: TranslationMemoryService,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  async listPublished(query: PublicPostsQuery, locale: Locale): Promise<PostList> {
    const filter = and(
      eq(posts.status, "published"),
      eq(posts.locale, "vi"),
      query.section === undefined ? undefined : eq(posts.section, query.section),
    );
    const rows = await this.db
      .select(summaryColumns)
      .from(posts)
      .where(filter)
      .orderBy(...newestFirst)
      .limit(query.limit)
      .offset(query.offset);
    const [totals] = await this.db.select({ total: count() }).from(posts).where(filter);
    const items = rows.map(toSummary);
    const map = await this.memory.lookup(
      locale,
      items.flatMap((item) => [item.title, item.summary]),
    );
    return {
      posts: items.map((item) => ({
        ...item,
        title: map.get(item.title) ?? item.title,
        summary: map.get(item.summary) ?? item.summary,
      })),
      total: totals?.total ?? 0,
    };
  }

  async readPublished(section: PostSummary["section"], slug: string, locale: Locale): Promise<PostDetail> {
    const [row] = await this.db
      .select(detailColumns)
      .from(posts)
      .where(
        and(
          eq(posts.status, "published"),
          eq(posts.locale, "vi"),
          eq(posts.section, section),
          eq(posts.slug, slug),
        ),
      )
      .limit(1);
    if (row === undefined) {
      throw postNotFound();
    }
    const post = toDetail(row);
    const map = await this.memory.lookup(locale, [
      post.title,
      post.summary,
      ...collectRichTexts(post.body),
    ]);
    return {
      ...post,
      title: map.get(post.title) ?? post.title,
      summary: map.get(post.summary) ?? post.summary,
      body: applyRichTexts(post.body, map),
    };
  }

  async list(query: AdminPostsQuery): Promise<AdminPostList> {
    const pattern = query.q === undefined ? undefined : `%${escapeLike(query.q)}%`;
    const conditions: (SQL | undefined)[] = [
      query.section === undefined ? undefined : eq(posts.section, query.section),
      query.status === undefined ? undefined : eq(posts.status, query.status),
      pattern === undefined
        ? undefined
        : or(ilike(posts.title, pattern), ilike(posts.slug, pattern), ilike(posts.category, pattern)),
    ];
    const filter = and(...conditions);
    const rows = await this.db
      .select(summaryColumns)
      .from(posts)
      .where(filter)
      .orderBy(...newestFirst)
      .limit(query.limit)
      .offset(query.offset);
    const [totals] = await this.db.select({ total: count() }).from(posts).where(filter);
    return {
      posts: rows.map((row) => ({ ...toSummary(row), updatedAt: row.updatedAt.toISOString() })),
      total: totals?.total ?? 0,
    };
  }

  async detail(id: string): Promise<PostDetail> {
    const [row] = await this.db.select(detailColumns).from(posts).where(eq(posts.id, id)).limit(1);
    if (row === undefined) {
      throw postNotFound();
    }
    return toDetail(row);
  }

  async create(raw: unknown, actor: AdminIdentity, ip: string): Promise<PostDetail> {
    const input = parseInput(raw);
    try {
      const id = await this.db.transaction(async (tx) => {
        const [row] = await tx
          .insert(posts)
          .values({ ...columnsFrom(input), coverFileId: null, authorAdminId: actor.adminId })
          .returning({ id: posts.id });
        if (row === undefined) {
          throw new Error("Không tạo được bài viết");
        }
        await this.attachImages(tx, row.id, input);
        await this.record(tx, "post.create", row.id, input, actor, ip);
        return row.id;
      });
      return await this.detail(id);
    } catch (error) {
      throw slugTaken(error);
    }
  }

  async update(
    id: string,
    patch: Record<string, unknown>,
    actor: AdminIdentity,
    ip: string,
  ): Promise<PostDetail> {
    try {
      await this.db.transaction(async (tx) => {
        const [locked] = await tx.select({ id: posts.id }).from(posts).where(eq(posts.id, id)).for("update");
        if (locked === undefined) {
          throw postNotFound();
        }
        const [current] = await tx.select(detailColumns).from(posts).where(eq(posts.id, id));
        if (current === undefined) {
          throw postNotFound();
        }
        const input = parseInput({ ...toDetail(current), ...patch });
        await this.attachImages(tx, id, input);
        await tx
          .update(posts)
          .set({ ...columnsFrom(input), updatedAt: new Date() })
          .where(eq(posts.id, id));
        await this.record(tx, "post.update", id, input, actor, ip, Object.keys(patch));
      });
      return await this.detail(id);
    } catch (error) {
      throw slugTaken(error);
    }
  }

  async remove(id: string, actor: AdminIdentity, ip: string): Promise<void> {
    await this.db.transaction(async (tx) => {
      const [current] = await tx
        .select({ section: posts.section, slug: posts.slug, status: posts.status })
        .from(posts)
        .where(eq(posts.id, id))
        .for("update");
      if (current === undefined) {
        throw postNotFound();
      }
      await this.images.detachAll(tx, id);
      await tx.delete(posts).where(eq(posts.id, id));
      await this.record(tx, "post.delete", id, current, actor, ip);
    });
  }

  private async attachImages(tx: Transaction, postId: string, input: PostInput): Promise<void> {
    const refs = collectPostImageRefs(input.coverUrl, input.body);
    await this.images.replace(tx, postId, refs);
    const coverFileId = postImageId(input.coverUrl);
    if (coverFileId !== null) {
      await tx.update(posts).set({ coverFileId }).where(eq(posts.id, postId));
    }
  }

  private async record(
    tx: Transaction,
    action: string,
    postId: string,
    post: { section: string; slug: string; status: string },
    actor: AdminIdentity,
    ip: string,
    changed?: string[],
  ): Promise<void> {
    await this.audit.record(
      {
        actorType: "admin",
        actorId: actor.adminId,
        action,
        entity: "post",
        entityId: postId,
        meta: {
          section: post.section,
          slug: post.slug,
          status: post.status,
          ...(changed === undefined ? {} : { changed }),
        },
        ip,
      },
      tx,
    );
  }
}
