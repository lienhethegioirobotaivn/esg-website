import { randomUUID } from "node:crypto";
import { createReadStream, type ReadStream } from "node:fs";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, resolve, sep } from "node:path";

import { Inject, Injectable } from "@nestjs/common";

import { APP_ENV } from "../config/config.constants.js";
import type { AppEnv } from "../config/env.schema.js";

const STORAGE_KEY_PATTERN = /^\d{4}\/\d{2}\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

@Injectable()
export class StorageService {
  private readonly root: string;

  constructor(@Inject(APP_ENV) env: AppEnv) {
    this.root = resolve(env.STORAGE_DIR);
  }

  async write(content: Buffer, now: Date = new Date()): Promise<string> {
    const year = now.getUTCFullYear().toString().padStart(4, "0");
    const month = (now.getUTCMonth() + 1).toString().padStart(2, "0");
    const key = `${year}/${month}/${randomUUID()}`;
    const target = this.pathOf(key);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, content, { flag: "wx", mode: 0o640 });
    return key;
  }

  open(key: string): ReadStream {
    return createReadStream(this.pathOf(key));
  }

  async remove(key: string): Promise<void> {
    await rm(this.pathOf(key), { force: true });
  }

  pathOf(key: string): string {
    if (!STORAGE_KEY_PATTERN.test(key)) {
      throw new Error("Khóa lưu trữ không hợp lệ");
    }
    const target = resolve(this.root, key);
    if (!target.startsWith(this.root + sep)) {
      throw new Error("Khóa lưu trữ nằm ngoài thư mục lưu trữ");
    }
    return target;
  }
}
