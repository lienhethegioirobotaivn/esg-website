import { Module } from "@nestjs/common";

import { MailModule } from "../mail/mail.module.js";
import { AdminInquiriesController } from "./admin-inquiries.controller.js";
import { InquiriesController } from "./inquiries.controller.js";
import { InquiriesService } from "./inquiries.service.js";

@Module({
  imports: [MailModule],
  controllers: [InquiriesController, AdminInquiriesController],
  providers: [InquiriesService],
})
export class InquiriesModule {}
