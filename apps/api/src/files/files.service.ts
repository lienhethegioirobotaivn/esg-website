import { createHash } from "node:crypto";
import { access } from "node:fs/promises";
import type { ReadStream } from "node:fs";

import { Inject, Injectable, Logger } from "@nestjs/common";
import { and, eq, inArray, isNotNull, isNull, lt, sql } from "drizzle-orm";

import { AppError } from "../common/app-error.js";
import type { Database } from "../database/client.js";
import { DATABASE } from "../database/database.constants.js";
import { files } from "../database/schema/index.js";
import { detectFileType } from "./detect-file-type.js";
import {
  FILE_PURGE_GRACE_DAYS,
  FILE_RULES,
  FILE_UNREFERENCED_GRACE_HOURS,
  type FileMime,
  type UploadKind,
} from "./file-rules.js";
import { StorageService } from "./storage.service.js";

export interface UploadInput {
  buffer: Buffer;
  kind: UploadKind;
  ownerUserId: string | null;
  originalName: string | null;
}

export interface StoredFile {
  id: string;
  mime: FileMime;
  size: number;
}

export interface OpenedFile {
  stream: ReadStream;
  mime: string;
  size: number;
  originalName: string | null;
}

type Executor = Pick<Database, "update">;

const FILE_MESSAGES: Readonly<Record<UploadKind, { type: string; size: string }>> = {
  logo: {
    type: "Logo phải là ảnh PNG, JPG hoặc WEBP.",
    size: "Logo không được lớn hơn 2 MB.",
  },
  evidence: {
    type: "Tệp minh chứng phải là PDF, PNG, JPG hoặc WEBP.",
    size: "Tệp minh chứng không được lớn hơn 10 MB.",
  },
  export_pdf: {
    type: "Tệp PDF không hợp lệ.",
    size: "Tệp PDF không được lớn hơn 25 MB.",
  },
  export_docx: {
    type: "Tệp Word không hợp lệ.",
    size: "Tệp Word không được lớn hơn 25 MB.",
  },
  post_image: {
    type: "Ảnh phải là JPG, PNG hoặc WEBP.",
    size: "Ảnh không được lớn hơn 3 MB.",
  },
};

@Injectable()
export class FilesService {
  private readonly logger = new Logger("Files");

  constructor(
    @Inject(DATABASE) private readonly db: Database,
    @Inject(StorageService) private readonly storage: StorageService,
  ) {}

  async upload(input: UploadInput): Promise<StoredFile> {
    const rule = FILE_RULES[input.kind];
    const messages = FILE_MESSAGES[input.kind];
    if (input.buffer.length === 0) {
      throw new AppError(400, "invalid_file", messages.type);
    }
    if (input.buffer.length > rule.maxBytes) {
      throw new AppError(413, "file_too_large", messages.size);
    }
    const mime = detectFileType(input.buffer);
    if (mime === null || !rule.mimes.includes(mime)) {
      throw new AppError(400, "invalid_file", messages.type);
    }

    const sha256 = createHash("sha256").update(input.buffer).digest("hex");
    const storageKey = await this.storage.write(input.buffer);
    try {
      const [row] = await this.db
        .insert(files)
        .values({
          storageKey,
          kind: input.kind,
          mime,
          size: input.buffer.length,
          sha256,
          ownerUserId: input.ownerUserId,
          originalName: input.originalName?.slice(0, 200) ?? null,
        })
        .returning({ id: files.id });
      if (row === undefined) {
        throw new Error("Không ghi được dòng tệp");
      }
      return { id: row.id, mime, size: input.buffer.length };
    } catch (error) {
      await this.storage.remove(storageKey).catch(() => undefined);
      throw error;
    }
  }

  async open(fileId: string): Promise<OpenedFile | null> {
    const [row] = await this.db
      .select({
        storageKey: files.storageKey,
        mime: files.mime,
        size: files.size,
        originalName: files.originalName,
        deletedAt: files.deletedAt,
      })
      .from(files)
      .where(eq(files.id, fileId))
      .limit(1);
    if (row === undefined || row.deletedAt !== null) {
      return null;
    }
    try {
      await access(this.pathFor(row.storageKey));
    } catch {
      return null;
    }
    return {
      stream: this.storage.open(row.storageKey),
      mime: row.mime,
      size: row.size,
      originalName: row.originalName,
    };
  }

  async markReferenced(executor: Executor, fileIds: readonly string[]): Promise<void> {
    if (fileIds.length === 0) {
      return;
    }
    await executor
      .update(files)
      .set({ referencedAt: sql`now()` })
      .where(and(inArray(files.id, [...fileIds]), isNull(files.referencedAt)));
  }

  async markDeleted(executor: Executor, fileIds: readonly string[]): Promise<void> {
    if (fileIds.length === 0) {
      return;
    }
    await executor
      .update(files)
      .set({ deletedAt: sql`now()` })
      .where(and(inArray(files.id, [...fileIds]), isNull(files.deletedAt)));
  }

  async softDeleteUnreferenced(): Promise<number> {
    const rows = await this.db
      .update(files)
      .set({ deletedAt: sql`now()` })
      .where(
        and(
          isNull(files.referencedAt),
          isNull(files.deletedAt),
          lt(files.createdAt, sql`now() - make_interval(hours => ${FILE_UNREFERENCED_GRACE_HOURS})`),
        ),
      )
      .returning({ id: files.id });
    return rows.length;
  }

  async purgeDeleted(batchSize = 200): Promise<number> {
    let purged = 0;
    for (;;) {
      const batch = await this.db
        .select({ id: files.id, storageKey: files.storageKey })
        .from(files)
        .where(
          and(
            isNotNull(files.deletedAt),
            lt(files.deletedAt, sql`now() - make_interval(days => ${FILE_PURGE_GRACE_DAYS})`),
          ),
        )
        .limit(batchSize);
      if (batch.length === 0) {
        return purged;
      }
      const removed: string[] = [];
      for (const row of batch) {
        try {
          await this.storage.remove(row.storageKey);
          removed.push(row.id);
        } catch (error) {
          this.logger.error(
            `Không xóa được tệp ${row.storageKey}: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }
      if (removed.length === 0) {
        return purged;
      }
      await this.db.delete(files).where(inArray(files.id, removed));
      purged += removed.length;
      if (batch.length < batchSize) {
        return purged;
      }
    }
  }

  private pathFor(storageKey: string): string {
    return this.storage.pathOf(storageKey);
  }
}
