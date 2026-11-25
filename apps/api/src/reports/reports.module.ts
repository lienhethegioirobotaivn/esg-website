import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module.js";
import { MyReportsController } from "./my-reports.controller.js";
import { ReportLifecycleService } from "./report-lifecycle.service.js";
import { ReportsController } from "./reports.controller.js";
import { ReportsService } from "./reports.service.js";

@Module({
  imports: [AuthModule],
  controllers: [ReportsController, MyReportsController],
  providers: [ReportsService, ReportLifecycleService],
  exports: [ReportLifecycleService],
})
export class ReportsModule {}
