import { z } from "zod";

import {
  HEADCOUNT_TIERS,
  INQUIRY_KINDS,
  INQUIRY_PRIORITIES,
  INQUIRY_STATUSES,
  SECTOR_CODES,
} from "../database/schema/index.js";
import { pageQuerySchema } from "../common/pagination.js";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => (value === "" ? undefined : value))
    .optional();

export const createInquirySchema = z
  .object({
    kind: z.enum(INQUIRY_KINDS),
    companyName: z.string().trim().min(1).max(200),
    contactEmail: z
      .string()
      .trim()
      .toLowerCase()
      .max(120)
      .pipe(z.email())
      .or(z.literal("").transform(() => undefined))
      .optional(),
    contactPhone: z
      .string()
      .trim()
      .regex(/^[0-9+().\-\s]{6,30}$/)
      .or(z.literal("").transform(() => undefined))
      .optional(),
    message: optionalText(2000),
    headcountTier: z.enum(HEADCOUNT_TIERS).optional(),
    sector: z.enum(SECTOR_CODES).optional(),
    contactConsent: z.boolean().default(false),
    reportCode: z
      .string()
      .trim()
      .regex(/^ESG-\d{8}-[A-Z0-9]{4}$/)
      .optional(),
  })
  .refine((value) => value.contactEmail !== undefined || value.contactPhone !== undefined, {
    message: "Cần ít nhất một cách liên hệ.",
  });

export const listInquiriesQuerySchema = pageQuerySchema.extend({
  status: z.enum(INQUIRY_STATUSES).optional(),
  kind: z.enum(INQUIRY_KINDS).optional(),
  assignedAdminId: z.uuid().optional(),
  q: z.string().trim().min(1).max(100).optional(),
});

export const updateInquirySchema = z
  .object({
    status: z.enum(INQUIRY_STATUSES),
    priority: z.enum(INQUIRY_PRIORITIES),
    assignedAdminId: z.uuid().nullable(),
    followUpAt: z.iso.datetime({ offset: true }).nullable(),
    outcome: z.string().trim().max(500).nullable(),
  })
  .partial()
  .refine((value) => Object.keys(value).length > 0, { message: "Không có thay đổi nào." });

export const createNoteSchema = z.object({ body: z.string().trim().min(1).max(2000) });

export type CreateInquiryInput = z.infer<typeof createInquirySchema>;
export type ListInquiriesQuery = z.infer<typeof listInquiriesQuerySchema>;
export type UpdateInquiryInput = z.infer<typeof updateInquirySchema>;
