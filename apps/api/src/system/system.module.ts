import { Module } from "@nestjs/common";

import { JobsModule } from "../jobs/jobs.module.js";
import { AdminSystemController } from "./admin-system.controller.js";
import { FileHealthService } from "./file-health.service.js";
import { JobsAdminService } from "./jobs-admin.service.js";
import { OutboxService } from "./outbox.service.js";

@Module({
  imports: [JobsModule],
  controllers: [AdminSystemController],
  providers: [JobsAdminService, OutboxService, FileHealthService],
})
export class SystemModule {}
