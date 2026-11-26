import { Module } from "@nestjs/common";

import { AdminStatsController, StatsController } from "./stats.controller.js";
import { StatsService } from "./stats.service.js";

@Module({
  controllers: [StatsController, AdminStatsController],
  providers: [StatsService],
})
export class StatsModule {}
