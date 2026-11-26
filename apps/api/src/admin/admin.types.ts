import type { Request } from "express";

import type { AdminRole } from "../database/schema/index.js";

export interface AdminIdentity {
  adminId: string;
  email: string;
  name: string;
  role: AdminRole;
  sessionId: string;
}

export interface AdminRequest extends Request {
  admin?: AdminIdentity;
}
