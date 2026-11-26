import { Module } from "@nestjs/common";

import { MailModule } from "../mail/mail.module.js";
import { AdminFeedbackController } from "./admin-feedback.controller.js";
import { FeedbackInviteService } from "./feedback-invite.service.js";
import { FeedbackController } from "./feedback.controller.js";
import { FeedbackService } from "./feedback.service.js";

@Module({
  imports: [MailModule],
  controllers: [FeedbackController, AdminFeedbackController],
  providers: [FeedbackService, FeedbackInviteService],
  exports: [FeedbackInviteService],
})
export class FeedbackModule {}
