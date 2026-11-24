import { randomBytes } from "node:crypto";

import pg from "pg";

export interface TemporaryDatabase {
  url: string;
  pool: pg.Pool;
  drop: () => Promise<void>;
}

export function requireTestDatabaseUrl(): string {
  const url = process.env["TEST_DATABASE_URL"];
  if (!url) {
    throw new Error(
      "Thiếu TEST_DATABASE_URL. Ví dụ: postgres://esg:esg@localhost:5432/postgres (tài khoản cần quyền tạo database).",
    );
  }
  return url;
}

export async function createTemporaryDatabase(): Promise<TemporaryDatabase> {
  const adminUrl = requireTestDatabaseUrl();
  const name = `esg_test_${randomBytes(6).toString("hex")}`;

  const admin = new pg.Client({ connectionString: adminUrl });
  await admin.connect();
  await admin.query(`create database ${name}`);
  await admin.end();

  const url = new URL(adminUrl);
  url.pathname = `/${name}`;
  const pool = new pg.Pool({ connectionString: url.toString(), max: 5 });

  return {
    url: url.toString(),
    pool,
    drop: async () => {
      await pool.end();
      const cleaner = new pg.Client({ connectionString: adminUrl });
      await cleaner.connect();
      await cleaner.query(`drop database if exists ${name} with (force)`);
      await cleaner.end();
    },
  };
}
