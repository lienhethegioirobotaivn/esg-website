import { Module } from "@nestjs/common";

import { SurveyBankController } from "./survey-bank.controller.js";
import { SurveyBankService } from "./survey-bank.service.js";

@Module({
  controllers: [SurveyBankController],
  providers: [SurveyBankService],
})
export class QuestionBankModule {}
