import { Module } from "@nestjs/common";

import { BankAdminController } from "./bank-admin.controller.js";
import { BankAdminService } from "./bank-admin.service.js";
import { BankQuestionsService } from "./bank-questions.service.js";
import { SurveyBankController } from "./survey-bank.controller.js";
import { SurveyBankService } from "./survey-bank.service.js";

@Module({
  controllers: [SurveyBankController, BankAdminController],
  providers: [SurveyBankService, BankAdminService, BankQuestionsService],
})
export class QuestionBankModule {}
