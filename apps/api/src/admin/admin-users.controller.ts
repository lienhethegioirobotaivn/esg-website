import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  Inject,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import type { Request } from "express";

import { clientIp } from "../common/client-ip.js";
import { parseBody } from "../common/parse-body.js";
import { AdminSessionGuard, CurrentAdmin, Roles } from "./admin-session.guard.js";
import { AdminUsersService, type AdminUserView } from "./admin-users.service.js";
import { createAdminSchema, updateAdminSchema, uuidParamSchema } from "./admin.schemas.js";
import type { AdminIdentity } from "./admin.types.js";

@Controller("admin/users")
@UseGuards(AdminSessionGuard)
@Roles("admin")
export class AdminUsersController {
  constructor(@Inject(AdminUsersService) private readonly users: AdminUsersService) {}

  @Get()
  @Header("Cache-Control", "private, no-store")
  list(): Promise<{ users: AdminUserView[] }> {
    return this.users.list();
  }

  @Post()
  @HttpCode(201)
  create(
    @Body() body: unknown,
    @CurrentAdmin() admin: AdminIdentity,
    @Req() request: Request,
  ): Promise<AdminUserView> {
    return this.users.create(parseBody(createAdminSchema, body), admin, clientIp(request));
  }

  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body() body: unknown,
    @CurrentAdmin() admin: AdminIdentity,
    @Req() request: Request,
  ): Promise<AdminUserView> {
    return this.users.update(
      parseBody(uuidParamSchema, id),
      parseBody(updateAdminSchema, body),
      admin,
      clientIp(request),
    );
  }
}
