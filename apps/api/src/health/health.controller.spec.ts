import { describe, expect, it, vi } from "vitest";
import type { Response } from "express";

import type { Database } from "../database/client.js";
import { HealthController } from "./health.controller.js";

function createResponse() {
  const status = vi.fn();
  return { response: { status } as unknown as Response, status };
}

function createController(execute: () => Promise<unknown>) {
  return new HealthController({ execute } as unknown as Database);
}

describe("HealthController", () => {
  it("trả ok khi database trả lời", async () => {
    const { response, status } = createResponse();
    const controller = createController(() => Promise.resolve([{ "?column?": 1 }]));

    const body = await controller.check(response);

    expect(body.status).toBe("ok");
    expect(body.database).toBe("up");
    expect(body.uptimeSeconds).toBeGreaterThanOrEqual(0);
    expect(status).not.toHaveBeenCalled();
  });

  it("trả 503 khi database lỗi", async () => {
    const { response, status } = createResponse();
    const controller = createController(() => Promise.reject(new Error("ECONNREFUSED")));

    const body = await controller.check(response);

    expect(body.status).toBe("error");
    expect(body.database).toBe("down");
    expect(status).toHaveBeenCalledWith(503);
  });

  it("trả 503 khi database không trả lời kịp", async () => {
    vi.useFakeTimers();
    try {
      const { response, status } = createResponse();
      const controller = createController(() => new Promise(() => undefined));

      const pending = controller.check(response);
      await vi.advanceTimersByTimeAsync(3100);
      const body = await pending;

      expect(body.database).toBe("down");
      expect(status).toHaveBeenCalledWith(503);
    } finally {
      vi.useRealTimers();
    }
  });
});
