import type { z } from "zod";

import { AppError } from "./app-error.js";

export function parseBody<S extends z.ZodType>(
  schema: S,
  body: unknown,
  failure: { code: string; message: string } = {
    code: "invalid_request",
    message: "Dữ liệu gửi lên không hợp lệ.",
  },
): z.output<S> {
  const result = schema.safeParse(body);
  if (!result.success) {
    throw new AppError(400, failure.code, failure.message);
  }
  return result.data;
}
