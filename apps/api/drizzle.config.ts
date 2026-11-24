import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/database/schema/index.ts",
  out: "./drizzle",
  casing: "snake_case",
  dbCredentials: {
    url: process.env["DATABASE_URL"] ?? "postgres://esg:esg@localhost:5432/esg",
  },
  strict: true,
  verbose: true,
});
