import type { Request } from "express";

export interface AuthUser {
  userId: string;
  email: string;
  sessionId: string;
}

export interface AuthenticatedRequest extends Request {
  authUser?: AuthUser;
}
