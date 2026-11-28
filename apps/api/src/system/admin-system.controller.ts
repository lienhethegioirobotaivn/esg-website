import type { AdminSettingsView, FileHealth, JobView, OutboxList } from "@esg/shared/node";
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
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import type { Request } from "express";

import { AdminSessionGuard, CurrentAdmin, Roles } from "../admin/admin-session.guard.js";
import { uuidParamSchema } from "../admin/admin.schemas.js";
import type { AdminIdentity } from "../admin/admin.types.js";
import { AuditService } from "../audit/audit.service.js";
import { clientIp } from "../common/client-ip.js";
import { parseBody } from "../common/parse-body.js";
import type { JobRunOutcome } from "../jobs/job-scheduler.js";
import { settingsPatchSchema } from "../settings/settings.schemas.js";
import { SettingsService } from "../settings/settings.service.js";
import { FileHealthService } from "./file-health.service.js";
import { JobsAdminService } from "./jobs-admin.service.js";
import { OutboxService } from "./outbox.service.js";
import { jobNameSchema, outboxQuerySchema } from "./system.schemas.js";

@Controller("admin")
@UseGuards(AdminSessionGuard)
@Roles("admin")
export class AdminSystemController {
  constructor(
    @Inject(JobsAdminService) private readonly jobs: JobsAdminService,
    @Inject(OutboxService) private readonly outbox: OutboxService,
    @Inject(FileHealthService) private readonly fileHealth: FileHealthService,
    @Inject(SettingsService) private readonly settings: SettingsService,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  @Get("jobs")
  @Header("Cache-Control", "private, no-store")
  listJobs(): Promise<{ jobs: JobView[] }> {
    return this.jobs.list();
  }

  @Post("jobs/:name/run")
  @HttpCode(200)
  async runJob(
    @Param("name") name: string,
    @CurrentAdmin() admin: AdminIdentity,
    @Req() request: Request,
  ): Promise<{ outcome: JobRunOutcome; job: JobView }> {
    const result = await this.jobs.run(parseBody(jobNameSchema, name));
    await this.audit.record({
      actorType: "admin",
      actorId: admin.adminId,
      action: "job.run",
      entity: "job",
      entityId: result.job.name,
      meta: { outcome: result.outcome },
      ip: clientIp(request),
    });
    return result;
  }

  @Get("outbox")
  @Header("Cache-Control", "private, no-store")
  listOutbox(@Query() query: unknown): Promise<OutboxList> {
    return this.outbox.list(parseBody(outboxQuerySchema, query));
  }

  @Post("outbox/:id/retry")
  @HttpCode(204)
  retryEmail(
    @Param("id") id: string,
    @CurrentAdmin() admin: AdminIdentity,
    @Req() request: Request,
  ): Promise<void> {
    return this.outbox.retry(parseBody(uuidParamSchema, id), admin, clientIp(request));
  }

  @Delete("outbox/:id")
  @HttpCode(204)
  removeEmail(
    @Param("id") id: string,
    @CurrentAdmin() admin: AdminIdentity,
    @Req() request: Request,
  ): Promise<void> {
    return this.outbox.remove(parseBody(uuidParamSchema, id), admin, clientIp(request));
  }

  @Get("files/health")
  @Header("Cache-Control", "private, no-store")
  checkFiles(): Promise<FileHealth> {
    return this.fileHealth.check();
  }

  @Delete("files/untracked")
  async removeUntracked(
    @CurrentAdmin() admin: AdminIdentity,
    @Req() request: Request,
  ): Promise<{ removed: number }> {
    const removed = await this.fileHealth.removeUntracked();
    await this.audit.record({
      actorType: "admin",
      actorId: admin.adminId,
      action: "files.remove_untracked",
      entity: "file",
      meta: { removed },
      ip: clientIp(request),
    });
    return { removed };
  }

  @Get("settings")
  @Header("Cache-Control", "private, no-store")
  readSettings(): Promise<AdminSettingsView> {
    return this.settings.read();
  }

  @Patch("settings")
  async writeSettings(
    @Body() body: unknown,
    @CurrentAdmin() admin: AdminIdentity,
    @Req() request: Request,
  ): Promise<AdminSettingsView> {
    const patch = parseBody(settingsPatchSchema, body, {
      code: "invalid_request",
      message: "Số ngày phải từ 1 đến 29 và email phải đúng định dạng.",
    });
    await this.settings.write(patch);
    await this.audit.record({
      actorType: "admin",
      actorId: admin.adminId,
      action: "settings.update",
      entity: "settings",
      meta: { ...patch },
      ip: clientIp(request),
    });
    return this.settings.read();
  }
}
