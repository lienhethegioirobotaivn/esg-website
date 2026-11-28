import type { BankCheckResult, BankDetail, BankImportResult, BankSummary } from "@esg/shared/node";
import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  Inject,
  Param,
  Patch,
  Post,
  Put,
  Req,
  Res,
  UploadedFiles as Uploads,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileFieldsInterceptor } from "@nestjs/platform-express";
import type { Request, Response } from "express";

import { AdminSessionGuard, CurrentAdmin, Roles } from "../admin/admin-session.guard.js";
import { uuidParamSchema } from "../admin/admin.schemas.js";
import type { AdminIdentity } from "../admin/admin.types.js";
import { AppError } from "../common/app-error.js";
import { clientIp } from "../common/client-ip.js";
import { parseBody } from "../common/parse-body.js";
import { sendTableFile } from "../common/send-table.js";
import { firstFile, type UploadedFiles } from "../common/uploads.js";
import {
  bulkQuestionSchema,
  createBankSchema,
  createQuestionSchema,
  deleteQuestionsSchema,
  importBankSchema,
  reorderSchema,
  updateBankSchema,
  updateQuestionSchema,
} from "./bank-admin.schemas.js";
import { BankAdminService } from "./bank-admin.service.js";
import { BankQuestionsService } from "./bank-questions.service.js";
import { BANK_IMPORT_MAX_BYTES } from "./question-bank.constants.js";

const INVALID_QUESTION = {
  code: "invalid_request",
  message: "Dữ liệu câu hỏi không hợp lệ. Kiểm tra các ô bắt buộc và độ dài nội dung.",
};

@Controller("admin/question-banks")
@UseGuards(AdminSessionGuard)
@Roles("content")
export class BankAdminController {
  constructor(
    @Inject(BankAdminService) private readonly banks: BankAdminService,
    @Inject(BankQuestionsService) private readonly questions: BankQuestionsService,
  ) {}

  @Get()
  @Header("Cache-Control", "private, no-store")
  list(): Promise<{ banks: BankSummary[] }> {
    return this.banks.list();
  }

  @Post()
  @HttpCode(201)
  create(
    @Body() body: unknown,
    @CurrentAdmin() admin: AdminIdentity,
    @Req() request: Request,
  ): Promise<BankDetail> {
    return this.banks.createDraft(parseBody(createBankSchema, body ?? {}), admin, clientIp(request));
  }

  @Post("import")
  @HttpCode(200)
  @UseInterceptors(
    FileFieldsInterceptor([{ name: "file", maxCount: 1 }], {
      limits: { fileSize: BANK_IMPORT_MAX_BYTES },
    }),
  )
  import(
    @Uploads() files: UploadedFiles | undefined,
    @Body() body: unknown,
    @CurrentAdmin() admin: AdminIdentity,
    @Req() request: Request,
  ): Promise<BankImportResult> {
    const file = firstFile(files, "file");
    if (file === null) {
      throw new AppError(400, "invalid_file", "Hãy chọn file Excel (.xlsx) để nhập.");
    }
    return this.banks.importFile(
      file.buffer,
      parseBody(importBankSchema, body ?? {}),
      admin,
      clientIp(request),
    );
  }

  @Get(":id")
  @Header("Cache-Control", "private, no-store")
  detail(@Param("id") id: string): Promise<BankDetail> {
    return this.banks.detail(parseBody(uuidParamSchema, id));
  }

  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body() body: unknown,
    @CurrentAdmin() admin: AdminIdentity,
    @Req() request: Request,
  ): Promise<BankDetail> {
    return this.banks.update(
      parseBody(uuidParamSchema, id),
      parseBody(updateBankSchema, body),
      admin,
      clientIp(request),
    );
  }

  @Delete(":id")
  @HttpCode(204)
  remove(
    @Param("id") id: string,
    @CurrentAdmin() admin: AdminIdentity,
    @Req() request: Request,
  ): Promise<void> {
    return this.banks.remove(parseBody(uuidParamSchema, id), admin, clientIp(request));
  }

  @Get(":id/export")
  async export(@Param("id") id: string, @Res() response: Response): Promise<void> {
    sendTableFile(response, await this.banks.exportFile(parseBody(uuidParamSchema, id)));
  }

  @Post(":id/validate")
  @HttpCode(200)
  validate(@Param("id") id: string): Promise<BankCheckResult> {
    return this.banks.check(parseBody(uuidParamSchema, id));
  }

  @Post(":id/publish")
  @HttpCode(200)
  publish(
    @Param("id") id: string,
    @CurrentAdmin() admin: AdminIdentity,
    @Req() request: Request,
  ): Promise<BankDetail> {
    return this.banks.publish(parseBody(uuidParamSchema, id), admin, clientIp(request));
  }

  @Post(":id/questions")
  @HttpCode(201)
  addQuestion(
    @Param("id") id: string,
    @Body() body: unknown,
    @CurrentAdmin() admin: AdminIdentity,
    @Req() request: Request,
  ): Promise<BankDetail> {
    return this.questions.add(
      parseBody(uuidParamSchema, id),
      parseBody(createQuestionSchema, body, INVALID_QUESTION),
      admin,
      clientIp(request),
    );
  }

  @Patch(":id/questions/:questionId")
  updateQuestion(
    @Param("id") id: string,
    @Param("questionId") questionId: string,
    @Body() body: unknown,
    @CurrentAdmin() admin: AdminIdentity,
    @Req() request: Request,
  ): Promise<BankDetail> {
    return this.questions.update(
      parseBody(uuidParamSchema, id),
      parseBody(uuidParamSchema, questionId),
      parseBody(updateQuestionSchema, body, INVALID_QUESTION),
      admin,
      clientIp(request),
    );
  }

  @Post(":id/questions/bulk")
  @HttpCode(200)
  bulk(
    @Param("id") id: string,
    @Body() body: unknown,
    @CurrentAdmin() admin: AdminIdentity,
    @Req() request: Request,
  ): Promise<BankDetail> {
    return this.questions.bulk(
      parseBody(uuidParamSchema, id),
      parseBody(bulkQuestionSchema, body),
      admin,
      clientIp(request),
    );
  }

  @Post(":id/questions/delete")
  @HttpCode(200)
  removeQuestions(
    @Param("id") id: string,
    @Body() body: unknown,
    @CurrentAdmin() admin: AdminIdentity,
    @Req() request: Request,
  ): Promise<BankDetail> {
    return this.questions.remove(
      parseBody(uuidParamSchema, id),
      parseBody(deleteQuestionsSchema, body).ids,
      admin,
      clientIp(request),
    );
  }

  @Put(":id/order")
  reorder(
    @Param("id") id: string,
    @Body() body: unknown,
    @CurrentAdmin() admin: AdminIdentity,
    @Req() request: Request,
  ): Promise<BankDetail> {
    return this.questions.reorder(
      parseBody(uuidParamSchema, id),
      parseBody(reorderSchema, body),
      admin,
      clientIp(request),
    );
  }
}
