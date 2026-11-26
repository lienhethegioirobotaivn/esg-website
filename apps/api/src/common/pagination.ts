import { z } from "zod";

export const pageQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).max(100_000).default(0),
});

export const exportQuerySchema = z.object({
  format: z.enum(["csv", "xlsx"]).default("csv"),
});

export const EXPORT_ROW_LIMIT = 10_000;

export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}
