import { Inject, Injectable } from "@nestjs/common";
import { and, eq } from "drizzle-orm";

import { hmacHex } from "../auth/crypto.js";
import { AppError } from "../common/app-error.js";
import { APP_ENV } from "../config/config.constants.js";
import type { AppEnv } from "../config/env.schema.js";
import type { Database } from "../database/client.js";
import { DATABASE } from "../database/database.constants.js";
import { postLikes, posts } from "../database/schema/index.js";
import { likesColumn } from "./post-view.js";

export interface LikeState {
  liked: boolean;
  likes: number;
}

@Injectable()
export class PostLikesService {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    @Inject(APP_ENV) private readonly env: AppEnv,
  ) {}

  async like(postId: string, viewerToken: string): Promise<LikeState> {
    await this.requirePublished(postId);
    await this.db
      .insert(postLikes)
      .values({ postId, voterKeyHash: this.voterKey(viewerToken) })
      .onConflictDoNothing();
    return { liked: true, likes: await this.count(postId) };
  }

  async unlike(postId: string, viewerToken: string | null): Promise<LikeState> {
    await this.requirePublished(postId);
    if (viewerToken !== null) {
      await this.db
        .delete(postLikes)
        .where(and(eq(postLikes.postId, postId), eq(postLikes.voterKeyHash, this.voterKey(viewerToken))));
    }
    return { liked: false, likes: await this.count(postId) };
  }

  private voterKey(viewerToken: string): string {
    return hmacHex(this.env.SESSION_SECRET, `voter:${viewerToken}`);
  }

  private async requirePublished(postId: string): Promise<void> {
    const [row] = await this.db
      .select({ id: posts.id })
      .from(posts)
      .where(and(eq(posts.id, postId), eq(posts.status, "published")))
      .limit(1);
    if (row === undefined) {
      throw new AppError(404, "post_not_found", "Không tìm thấy bài viết.");
    }
  }

  private async count(postId: string): Promise<number> {
    const [row] = await this.db.select({ likes: likesColumn }).from(posts).where(eq(posts.id, postId));
    return row?.likes ?? 0;
  }
}
