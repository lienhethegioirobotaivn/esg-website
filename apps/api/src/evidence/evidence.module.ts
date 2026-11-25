import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module.js";
import { EvidenceController } from "./evidence.controller.js";
import { EvidenceService } from "./evidence.service.js";

@Module({
  imports: [AuthModule],
  controllers: [EvidenceController],
  providers: [EvidenceService],
})
export class EvidenceModule {}
