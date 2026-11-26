import type { NestExpressApplication } from "@nestjs/platform-express";
import type pg from "pg";
import request from "supertest";

import { hashPassword } from "../../src/admin/password.js";

const PASSWORD = "mat-khau-thu-nghiem-123";

export async function adminSession(
  app: NestExpressApplication,
  pool: pg.Pool,
  role: "admin" | "content" | "ops",
): Promise<string> {
  const email = `${role}@example.com`;
  await pool.query(
    "insert into admin_users (email, name, role, password_hash) values ($1, $2, $3, $4) on conflict do nothing",
    [email, `Tên ${role}`, role, await hashPassword(PASSWORD)],
  );
  const response = await request(app.getHttpServer())
    .post("/api/v1/admin/login")
    .send({ email, password: PASSWORD })
    .expect(200);
  const cookies = response.headers["set-cookie"] as unknown as string[];
  return cookies.map((cookie) => cookie.split(";")[0]).join("; ");
}
