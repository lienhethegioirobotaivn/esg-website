import {
  Inject,
  Injectable,
  createParamDecorator,
  type CanActivate,
  type ExecutionContext,
} from "@nestjs/common";

import { AppError } from "../common/app-error.js";
import { USER_COOKIE_NAME } from "./auth.constants.js";
import { AuthService } from "./auth.service.js";
import type { AuthUser, AuthenticatedRequest } from "./auth.types.js";
import { readCookie } from "./cookies.js";

@Injectable()
export class UserSessionGuard implements CanActivate {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = readCookie(request.headers.cookie, USER_COOKIE_NAME);
    const user = token === null ? null : await this.auth.resolveSession(token);
    if (user === null) {
      throw new AppError(401, "unauthorized", "Bạn cần xác nhận email để tiếp tục.");
    }
    request.authUser = user;
    return true;
  }
}

export const CurrentUser = createParamDecorator((_data: unknown, context: ExecutionContext): AuthUser => {
  const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
  if (request.authUser === undefined) {
    throw new AppError(401, "unauthorized", "Bạn cần xác nhận email để tiếp tục.");
  }
  return request.authUser;
});
