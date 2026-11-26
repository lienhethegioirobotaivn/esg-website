import { Inject, Injectable } from "@nestjs/common";
import { and, eq, inArray, isNotNull, isNull, lt, notExists, sql } from "drizzle-orm";

import { AppError } from "../common/app-error.js";
import type { Database } from "../database/client.js";
import { DATABASE } from "../database/database.constants.js";
import { files, postFiles, type FileKind } from "../database/schema/index.js";
import { FilesService, type OpenedFile } from "../files/files.service.js";
import type { PostImageRef } from "./post-image-refs.js";
import { POST_IMAGE_RELEASE_GRACE_HOURS, POST_IMAGE_REVIVE_DAYS } from "./posts.constants.js";

export type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];

const IMAGE_KINDS: FileKind[] = ["post_image", "post_cover"];

export interface PostImageFile extends OpenedFile {
  sha256: string;
}

@Injectable()
export class PostImagesService {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    @Inject(FilesService) private readonly files: FilesService,
  ) {}

  async open(fileId: string): Promise<PostImageFile | null> {
    const [row] = await this.db
      .select({ sha256: files.sha256 })
      .from(files)
      .where(and(eq(files.id, fileId), inArray(files.kind, IMAGE_KINDS), isNull(files.deletedAt)))
      .limit(1);
    if (row === undefined) {
      return null;
    }
    const opened = await this.files.open(fileId);
    return opened === null ? null : { ...opened, sha256: row.sha256 };
  }

  async replace(tx: Transaction, postId: string, refs: readonly PostImageRef[]): Promise<void> {
    const previous = await this.attached(tx, postId);
    const next = refs.map((ref) => ref.fileId);
    const involved = [...new Set([...previous, ...next])].sort();
    if (involved.length === 0) {
      return;
    }
    const locked = await tx
      .select({
        id: files.id,
        kind: files.kind,
        usable: sql<boolean>`${files.deletedAt} is null or ${files.deletedAt} > now() - make_interval(days => ${POST_IMAGE_REVIVE_DAYS})`,
      })
      .from(files)
      .where(inArray(files.id, involved))
      .orderBy(files.id)
      .for("update");
    const byId = new Map(locked.map((row) => [row.id, row]));

    for (const ref of refs) {
      const row = byId.get(ref.fileId);
      if (row === undefined || !IMAGE_KINDS.includes(row.kind) || !row.usable) {
        const message = "Có ảnh không còn tồn tại trên máy chủ. Hãy tải ảnh đó lên lại.";
        throw new AppError(400, "invalid_image", message, { fields: { [ref.field]: message } });
      }
    }

    await tx.delete(postFiles).where(eq(postFiles.postId, postId));
    if (next.length > 0) {
      await tx.insert(postFiles).values(next.map((fileId) => ({ postId, fileId })));
      await tx
        .update(files)
        .set({ referencedAt: sql`now()`, deletedAt: null })
        .where(inArray(files.id, next));
    }
    const kept = new Set(next);
    await this.release(
      tx,
      previous.filter((fileId) => !kept.has(fileId)),
    );
  }

  async detachAll(tx: Transaction, postId: string): Promise<void> {
    const previous = (await this.attached(tx, postId)).sort();
    if (previous.length === 0) {
      return;
    }
    await tx
      .select({ id: files.id })
      .from(files)
      .where(inArray(files.id, previous))
      .orderBy(files.id)
      .for("update");
    await tx.delete(postFiles).where(eq(postFiles.postId, postId));
    await this.release(tx, previous);
  }

  async releaseUnused(): Promise<number> {
    const rows = await this.db
      .update(files)
      .set({ deletedAt: sql`now()` })
      .where(
        and(
          inArray(files.kind, IMAGE_KINDS),
          isNull(files.deletedAt),
          isNotNull(files.referencedAt),
          lt(files.referencedAt, sql`now() - make_interval(hours => ${POST_IMAGE_RELEASE_GRACE_HOURS})`),
          notExists(
            this.db
              .select({ one: sql`1` })
              .from(postFiles)
              .where(eq(postFiles.fileId, files.id)),
          ),
        ),
      )
      .returning({ id: files.id });
    return rows.length;
  }

  private async attached(tx: Transaction, postId: string): Promise<string[]> {
    const rows = await tx
      .select({ fileId: postFiles.fileId })
      .from(postFiles)
      .where(eq(postFiles.postId, postId));
    return rows.map((row) => row.fileId);
  }

  private async release(tx: Transaction, fileIds: readonly string[]): Promise<void> {
    if (fileIds.length === 0) {
      return;
    }
    const used = await tx
      .select({ fileId: postFiles.fileId })
      .from(postFiles)
      .where(inArray(postFiles.fileId, [...fileIds]));
    const inUse = new Set(used.map((row) => row.fileId));
    await this.files.markDeleted(
      tx,
      fileIds.filter((fileId) => !inUse.has(fileId)),
    );
  }
}
