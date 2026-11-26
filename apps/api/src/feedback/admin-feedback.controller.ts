import { Controller, Get, Header, Inject, Query, Req, Res, UseGuards } from "@nestjs/common";
import type { Request, Response } from "express";

import { AdminSessionGuard, CurrentAdmin, Roles } from "../admin/admin-session.guard.js";
import type { AdminIdentity } from "../admin/admin.types.js";
import { clientIp } from "../common/client-ip.js";
import { exportQuerySchema } from "../common/pagination.js";
import { parseBody } from "../common/parse-body.js";
import { sendTableFile } from "../common/send-table.js";
import { listFeedbackQuerySchema } from "./feedback.schemas.js";
import { FeedbackService } from "./feedback.service.js";

@Controller("admin/feedback")
@UseGuards(AdminSessionGuard)
@Roles("ops")
export class AdminFeedbackController {
  constructor(@Inject(FeedbackService) private readonly feedback: FeedbackService) {}

  @Get()
  @Header("Cache-Control", "private, no-store")
  list(@Query() query: unknown) {
    return this.feedback.list(parseBody(listFeedbackQuerySchema, query));
  }

  @Get("export")
  async export(
    @Query() query: unknown,
    @CurrentAdmin() admin: AdminIdentity,
    @Req() request: Request,
    @Res() response: Response,
  ): Promise<void> {
    const { format } = parseBody(exportQuerySchema, query);
    const filters = parseBody(listFeedbackQuerySchema, query);
    sendTableFile(response, await this.feedback.export(filters, format, admin, clientIp(request)));
  }
}
