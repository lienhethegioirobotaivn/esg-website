import { readdir, rm, stat } from "node:fs/promises";
import { join, resolve } from "node:path";

import type { FileHealth } from "@esg/shared/node";
import { Inject, Injectable } from "@nestjs/common";

import { APP_ENV } from "../config/config.constants.js";
import type { AppEnv } from "../config/env.schema.js";
import type { Database } from "../database/client.js";
import { DATABASE } from "../database/database.constants.js";
import { files } from "../database/schema/index.js";

const STORAGE_FILE =
  /^\d{4}\/\d{2}\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const UNTRACKED_GRACE_MS = 24 * 60 * 60 * 1000;
const MISSING_LIMIT = 100;

interface DiskFile {
  readonly key: string;
  readonly size: number;
  readonly modifiedAt: number;
}

@Injectable()
export class FileHealthService {
  private readonly root: string;

  constructor(
    @Inject(DATABASE) private readonly db: Database,
    @Inject(APP_ENV) env: AppEnv,
  ) {
    this.root = resolve(env.STORAGE_DIR);
  }

  async check(): Promise<FileHealth> {
    const onDisk = await this.scan();
    const rows = await this.rows();
    const known = new Set(rows.map((row) => row.storageKey));
    const present = new Set(onDisk.map((file) => file.key));
    const alive = rows.filter((row) => row.deletedAt === null);
    const missing = alive.filter((row) => !present.has(row.storageKey));
    const untracked = onDisk.filter((file) => !known.has(file.key));

    const kinds = new Map<string, { kind: string; count: number; bytes: number }>();
    for (const row of alive) {
      const entry = kinds.get(row.kind) ?? { kind: row.kind, count: 0, bytes: 0 };
      entry.count += 1;
      entry.bytes += row.size;
      kinds.set(row.kind, entry);
    }
    return {
      checkedAt: new Date().toISOString(),
      kinds: [...kinds.values()].sort((a, b) => a.kind.localeCompare(b.kind)),
      missing: missing.slice(0, MISSING_LIMIT).map((row) => ({
        id: row.id,
        kind: row.kind,
        originalName: row.originalName,
        createdAt: row.createdAt.toISOString(),
      })),
      missingTotal: missing.length,
      untracked: {
        count: untracked.length,
        bytes: untracked.reduce((total, file) => total + file.size, 0),
        removable: untracked.filter((file) => this.isRemovable(file)).length,
      },
      pendingPurge: rows.length - alive.length,
    };
  }

  async removeUntracked(): Promise<number> {
    const onDisk = await this.scan();
    const known = new Set((await this.rows()).map((row) => row.storageKey));
    const targets = onDisk.filter((file) => !known.has(file.key) && this.isRemovable(file));
    for (const file of targets) {
      await rm(join(this.root, file.key), { force: true });
    }
    return targets.length;
  }

  private isRemovable(file: DiskFile): boolean {
    return Date.now() - file.modifiedAt > UNTRACKED_GRACE_MS;
  }

  private rows() {
    return this.db
      .select({
        id: files.id,
        storageKey: files.storageKey,
        kind: files.kind,
        size: files.size,
        originalName: files.originalName,
        createdAt: files.createdAt,
        deletedAt: files.deletedAt,
      })
      .from(files);
  }

  private async scan(): Promise<DiskFile[]> {
    let entries: string[];
    try {
      entries = await readdir(this.root, { recursive: true });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return [];
      }
      throw error;
    }
    const result: DiskFile[] = [];
    for (const entry of entries) {
      const key = entry.replaceAll("\\", "/");
      if (!STORAGE_FILE.test(key)) {
        continue;
      }
      const info = await stat(join(this.root, key)).catch(() => null);
      if (info?.isFile() === true) {
        result.push({ key, size: info.size, modifiedAt: info.mtimeMs });
      }
    }
    return result;
  }
}
