import { z } from "zod";

import { pageQuerySchema } from "../common/pagination.js";
import { TRANSLATION_LOCALES } from "../database/schema/index.js";
import { MANUAL_ITEMS_MAX, MANUAL_TEXT_MAX_LENGTH } from "./translation.constants.js";

export const TRANSLATION_STATUS_FILTERS = ["all", "missing", "auto", "manual"] as const;

export const translationLocaleQuerySchema = z.object({ locale: z.enum(TRANSLATION_LOCALES) });

export const adminTranslationsQuerySchema = pageQuerySchema.extend({
  locale: z.enum(TRANSLATION_LOCALES),
  status: z.enum(TRANSLATION_STATUS_FILTERS).default("all"),
  q: z.string().trim().min(1).max(100).optional(),
});

export const manualTranslationsSchema = z.object({
  locale: z.enum(TRANSLATION_LOCALES),
  items: z
    .array(
      z.object({
        sourceHash: z.string().regex(/^[0-9a-f]{16}$/),
        manualText: z.string().trim().min(1).max(MANUAL_TEXT_MAX_LENGTH).nullable(),
      }),
    )
    .min(1)
    .max(MANUAL_ITEMS_MAX)
    .refine((items) => new Set(items.map((item) => item.sourceHash)).size === items.length),
});

export const translationRunSchema = z
  .object({
    locale: z.enum(TRANSLATION_LOCALES).optional(),
    prune: z.boolean().default(false),
    retryFailed: z.boolean().default(false),
  })
  .strict();

export type AdminTranslationsQuery = z.infer<typeof adminTranslationsQuerySchema>;
export type ManualTranslationsInput = z.infer<typeof manualTranslationsSchema>;
