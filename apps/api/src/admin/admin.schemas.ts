import { z } from "zod";

import { ADMIN_ROLES } from "../database/schema/index.js";
import { ADMIN_PASSWORD_MAX_LENGTH, ADMIN_PASSWORD_MIN_LENGTH } from "./admin.constants.js";

const email = z
  .string()
  .trim()
  .toLowerCase()
  .max(120)
  .pipe(z.email());

const password = z.string().min(ADMIN_PASSWORD_MIN_LENGTH).max(ADMIN_PASSWORD_MAX_LENGTH);

export const adminLoginSchema = z.object({
  email,
  password: z.string().min(1).max(ADMIN_PASSWORD_MAX_LENGTH),
});

export const createAdminSchema = z.object({
  email,
  name: z.string().trim().min(1).max(100),
  role: z.enum(ADMIN_ROLES),
  password,
});

export const updateAdminSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    role: z.enum(ADMIN_ROLES),
    active: z.boolean(),
    password,
  })
  .partial()
  .refine((value) => Object.keys(value).length > 0, { message: "Không có thay đổi nào." });

export const uuidParamSchema = z.uuid();

export type CreateAdminInput = z.infer<typeof createAdminSchema>;
export type UpdateAdminInput = z.infer<typeof updateAdminSchema>;
