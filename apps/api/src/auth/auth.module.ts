import { Module } from "@nestjs/common";

import { MailModule } from "../mail/mail.module.js";
import { AuthController } from "./auth.controller.js";
import { AuthService } from "./auth.service.js";
import { UserSessionGuard } from "./user-session.guard.js";

@Module({
  imports: [MailModule],
  controllers: [AuthController],
  providers: [AuthService, UserSessionGuard],
  exports: [AuthService, UserSessionGuard],
})
export class AuthModule {}
