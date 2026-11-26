import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import type { Request, Response } from "express";

import { AdminSessionGuard, CurrentAdmin, Roles } from "../admin/admin-session.guard.js";
import type { AdminIdentity } from "../admin/admin.types.js";
import { uuidParamSchema } from "../admin/admin.schemas.js";
import { clientIp } from "../common/client-ip.js";
import { exportQuerySchema } from "../common/pagination.js";
import { parseBody } from "../common/parse-body.js";
import { sendTableFile } from "../common/send-table.js";
import {
  createNoteSchema,
  listInquiriesQuerySchema,
  updateInquirySchema,
} from "./inquiries.schemas.js";
import { InquiriesService } from "./inquiries.service.js";

@Controller("admin/inquiries")
@UseGuards(AdminSessionGuard)
@Roles("ops")
export class AdminInquiriesController {
  constructor(@Inject(InquiriesService) private readonly inquiries: InquiriesService) {}

  @Get()
  @Header("Cache-Control", "private, no-store")
  list(@Query() query: unknown) {
    return this.inquiries.list(parseBody(listInquiriesQuerySchema, query));
  }

  @Get("export")
  async export(
    @Query() query: unknown,
    @CurrentAdmin() admin: AdminIdentity,
    @Req() request: Request,
    @Res() response: Response,
  ): Promise<void> {
    const { format } = parseBody(exportQuerySchema, query);
    const filters = parseBody(listInquiriesQuerySchema, query);
    sendTableFile(response, await this.inquiries.export(filters, format, admin, clientIp(request)));
  }

  @Get(":id")
  @Header("Cache-Control", "private, no-store")
  detail(@Param("id") id: string) {
    return this.inquiries.detail(parseBody(uuidParamSchema, id));
  }

  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body() body: unknown,
    @CurrentAdmin() admin: AdminIdentity,
    @Req() request: Request,
  ) {
    return this.inquiries.update(
      parseBody(uuidParamSchema, id),
      parseBody(updateInquirySchema, body),
      admin,
      clientIp(request),
    );
  }

  @Post(":id/notes")
  @HttpCode(201)
  addNote(
    @Param("id") id: string,
    @Body() body: unknown,
    @CurrentAdmin() admin: AdminIdentity,
    @Req() request: Request,
  ) {
    return this.inquiries.addNote(
      parseBody(uuidParamSchema, id),
      parseBody(createNoteSchema, body).body,
      admin,
      clientIp(request),
    );
  }
}
