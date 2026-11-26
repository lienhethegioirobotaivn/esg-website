import { z } from "zod";

import { pageQuerySchema } from "../common/pagination.js";
import { CARE_STATUSES } from "../database/schema/index.js";

export const listCustomersQuerySchema = pageQuerySchema.extend({
  careStatus: z.enum(CARE_STATUSES).optional(),
  assignedAdminId: z.uuid().optional(),
  q: z.string().trim().min(1).max(100).optional(),
});

export const updateCustomerSchema = z
  .object({
    careStatus: z.enum(CARE_STATUSES),
    nextContactAt: z.iso.datetime({ offset: true }).nullable(),
    careNote: z.string().trim().max(2000).nullable(),
    assignedAdminId: z.uuid().nullable(),
  })
  .partial()
  .refine((value) => Object.keys(value).length > 0, { message: "Không có thay đổi nào." });

export type ListCustomersQuery = z.infer<typeof listCustomersQuerySchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
