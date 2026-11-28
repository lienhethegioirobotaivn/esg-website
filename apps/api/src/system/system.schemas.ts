import { z } from "zod";

import { pageQuerySchema } from "../common/pagination.js";
import { EMAIL_STATUSES } from "../database/schema/index.js";

export const outboxQuerySchema = pageQuerySchema.extend({
  status: z.enum(EMAIL_STATUSES).default("failed"),
});

export const jobNameSchema = z.string().regex(/^[a-z][a-z-]{0,60}$/);
