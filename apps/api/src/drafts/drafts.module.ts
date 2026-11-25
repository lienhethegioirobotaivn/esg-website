import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module.js";
import { DraftsController } from "./drafts.controller.js";
import { DraftsService } from "./drafts.service.js";

@Module({
  imports: [AuthModule],
  controllers: [DraftsController],
  providers: [DraftsService],
})
export class DraftsModule {}
