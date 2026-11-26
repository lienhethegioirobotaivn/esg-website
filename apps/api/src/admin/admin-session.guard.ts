import {
  Inject,
  Injectable,
  SetMetadata,
  createParamDecorator,
  type CanActivate,
  type ExecutionContext,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";

import { readCookie } from "../auth/cookies.js";
import { AppError } from "../common/app-error.js";
import type { AdminRole } from "../database/schema/index.js";
import { ADMIN_COOKIE_NAME } from "./admin.constants.js";
import { AdminAuthService } from "./admin-auth.service.js";
import type { AdminIdentity, AdminRequest } from "./admin.types.js";

const ROLES_KEY = "esg:admin-roles";

export const Roles = (...roles: AdminRole[]) => SetMetadata(ROLES_KEY, roles);

@Injectable()
export class AdminSessionGuard implements CanActivate {
  constructor(
    @Inject(AdminAuthService) private readonly auth: AdminAuthService,
    @Inject(Reflector) private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AdminRequest>();
    const token = readCookie(request.headers.cookie, ADMIN_COOKIE_NAME);
    const admin = token === null ? null : await this.auth.resolveSession(token);
    if (admin === null) {
      throw new AppError(401, "unauthorized", "Bạn cần đăng nhập quản trị để tiếp tục.");
    }

    const allowed = this.reflector.getAllAndOverride<AdminRole[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (allowed !== undefined && admin.role !== "admin" && !allowed.includes(admin.role)) {
      throw new AppError(403, "forbidden", "Bạn không có quyền thực hiện thao tác này.");
    }
    request.admin = admin;
    return true;
  }
}

export const CurrentAdmin = createParamDecorator((_data: unknown, context: ExecutionContext): AdminIdentity => {
  const request = context.switchToHttp().getRequest<AdminRequest>();
  if (request.admin === undefined) {
    throw new AppError(401, "unauthorized", "Bạn cần đăng nhập quản trị để tiếp tục.");
  }
  return request.admin;
});
