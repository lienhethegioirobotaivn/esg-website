import { Global, Module } from "@nestjs/common";

import { AdminAssigneesController } from "./admin-assignees.controller.js";
import { AdminAuthController } from "./admin-auth.controller.js";
import { AdminAuthService } from "./admin-auth.service.js";
import { AdminBootstrapService } from "./admin-bootstrap.service.js";
import { AdminSessionGuard } from "./admin-session.guard.js";
import { AdminUsersController } from "./admin-users.controller.js";
import { AdminUsersService } from "./admin-users.service.js";

@Global()
@Module({
  controllers: [AdminAuthController, AdminUsersController, AdminAssigneesController],
  providers: [AdminAuthService, AdminUsersService, AdminBootstrapService, AdminSessionGuard],
  exports: [AdminAuthService, AdminSessionGuard, AdminBootstrapService],
})
export class AdminModule {}
