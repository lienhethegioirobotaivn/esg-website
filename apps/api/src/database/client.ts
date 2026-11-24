import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import pg from "pg";

import * as schema from "./schema/index.js";

export type Database = NodePgDatabase<typeof schema>;

export function createPool(connectionString: string, max: number): pg.Pool {
  return new pg.Pool({ connectionString, max });
}

export function createDatabase(pool: pg.Pool): Database {
  return drizzle({ client: pool, schema, casing: "snake_case" });
}
