import { AppError } from "./app-error.js";
import type { RateLimitService } from "../rate-limit/rate-limit.service.js";

export interface RateRule {
  readonly limit: number;
  readonly windowSeconds: number;
}

export async function enforceRate(
  rateLimit: RateLimitService,
  key: string,
  rule: RateRule,
): Promise<void> {
  const result = await rateLimit.hit({ key, limit: rule.limit, windowSeconds: rule.windowSeconds });
  if (!result.allowed) {
    throw new AppError(429, "rate_limited", "Bạn thao tác quá nhanh. Vui lòng thử lại sau ít phút.", {
      retryAfter: result.retryAfter,
    });
  }
}
