import {
  Body,
  Controller,
  Get,
  Header,
  Inject,
  Param,
  Patch,
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
import { listCustomersQuerySchema, updateCustomerSchema } from "./customers.schemas.js";
import { CustomersService } from "./customers.service.js";

@Controller("admin/customers")
@UseGuards(AdminSessionGuard)
@Roles("ops")
export class CustomersController {
  constructor(@Inject(CustomersService) private readonly customers: CustomersService) {}

  @Get()
  @Header("Cache-Control", "private, no-store")
  list(@Query() query: unknown) {
    return this.customers.list(parseBody(listCustomersQuerySchema, query));
  }

  @Get("export")
  async export(
    @Query() query: unknown,
    @CurrentAdmin() admin: AdminIdentity,
    @Req() request: Request,
    @Res() response: Response,
  ): Promise<void> {
    const { format } = parseBody(exportQuerySchema, query);
    const filters = parseBody(listCustomersQuerySchema, query);
    sendTableFile(response, await this.customers.export(filters, format, admin, clientIp(request)));
  }

  @Get(":id")
  @Header("Cache-Control", "private, no-store")
  detail(@Param("id") id: string) {
    return this.customers.detail(parseBody(uuidParamSchema, id));
  }

  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body() body: unknown,
    @CurrentAdmin() admin: AdminIdentity,
    @Req() request: Request,
  ) {
    return this.customers.update(
      parseBody(uuidParamSchema, id),
      parseBody(updateCustomerSchema, body),
      admin,
      clientIp(request),
    );
  }
}
