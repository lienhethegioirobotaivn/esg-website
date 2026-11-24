import { Global, Inject, Logger, Module, type OnApplicationShutdown } from "@nestjs/common";
import type pg from "pg";

import { APP_ENV } from "../config/config.constants.js";
import type { AppEnv } from "../config/env.schema.js";
import { createDatabase, createPool } from "./client.js";
import { DATABASE, DATABASE_POOL } from "./database.constants.js";
import { runMigrations } from "./migrate.js";

@Global()
@Module({
  providers: [
    {
      provide: DATABASE_POOL,
      inject: [APP_ENV],
      useFactory: async (env: AppEnv): Promise<pg.Pool> => {
        const pool = createPool(env.DATABASE_URL, env.DATABASE_POOL_MAX);
        pool.on("error", (error) => {
          new Logger("Database").error(`Lỗi kết nối PostgreSQL: ${error.message}`);
        });
        if (env.RUN_MIGRATIONS_ON_START) {
          const logger = new Logger("Database");
          logger.log("Đang chạy migration khi khởi động");
          await runMigrations(pool);
          logger.log("Migration hoàn tất");
        }
        return pool;
      },
    },
    {
      provide: DATABASE,
      inject: [DATABASE_POOL],
      useFactory: (pool: pg.Pool) => createDatabase(pool),
    },
  ],
  exports: [DATABASE_POOL, DATABASE],
})
export class DatabaseModule implements OnApplicationShutdown {
  constructor(@Inject(DATABASE_POOL) private readonly pool: pg.Pool) {}

  async onApplicationShutdown(): Promise<void> {
    await this.pool.end();
  }
}
