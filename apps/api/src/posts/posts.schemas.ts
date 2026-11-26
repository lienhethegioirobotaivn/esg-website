import { POST_SECTIONS } from "@esg/shared/node";
import { z } from "zod";

import { pageQuerySchema } from "../common/pagination.js";
import { LOCALES, POST_STATUSES } from "../database/schema/index.js";

export const localeQuerySchema = z.object({ locale: z.enum(LOCALES).default("vi") });

export const publicPostsQuerySchema = z.object({
  section: z.enum(POST_SECTIONS).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(100),
  offset: z.coerce.number().int().min(0).max(100_000).default(0),
});

export const publicPostParamsSchema = z.object({
  section: z.enum(POST_SECTIONS),
  slug: z.string().trim().min(1).max(120),
});

export const adminPostsQuerySchema = pageQuerySchema.extend({
  section: z.enum(POST_SECTIONS).optional(),
  status: z.enum(POST_STATUSES).optional(),
  q: z.string().trim().min(1).max(100).optional(),
});

export const postPatchSchema = z
  .record(z.string(), z.unknown())
  .refine((value) => Object.keys(value).length > 0, { message: "Không có thay đổi nào." });

export type PublicPostsQuery = z.infer<typeof publicPostsQuerySchema>;
export type AdminPostsQuery = z.infer<typeof adminPostsQuerySchema>;
