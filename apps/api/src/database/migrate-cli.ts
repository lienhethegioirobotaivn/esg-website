import { EnvValidationError, loadEnv } from "../config/env.schema.js";
import { loadEnvFile } from "../config/load-env-file.js";
import { createPool } from "./client.js";
import { runMigrations } from "./migrate.js";

async function main(): Promise<void> {
  loadEnvFile();
  const env = loadEnv(process.env);
  const pool = createPool(env.DATABASE_URL, 2);
  try {
    await runMigrations(pool);
    console.log("Migration hoàn tất.");
  } finally {
    await pool.end();
  }
}

main().catch((error: unknown) => {
  if (error instanceof EnvValidationError) {
    console.error(error.message);
  } else {
    console.error("Migration thất bại:", error);
  }
  process.exit(1);
});
