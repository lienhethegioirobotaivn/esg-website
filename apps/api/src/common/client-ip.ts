import type { Request } from "express";

export function clientIp(request: Pick<Request, "ip" | "socket">): string {
  return request.ip ?? request.socket.remoteAddress ?? "unknown";
}
