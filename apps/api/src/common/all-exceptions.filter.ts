import { Catch, Logger, type ArgumentsHost, type ExceptionFilter } from "@nestjs/common";
import type { Response } from "express";

import { AppError } from "./app-error.js";
import { toErrorResult } from "./error-body.js";

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger("Exceptions");

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const result = toErrorResult(exception);

    if (result.status >= 500) {
      if (exception instanceof AppError) {
        this.logger.warn(`${exception.code}: ${exception.message}`);
      } else {
        this.logger.error(
          exception instanceof Error ? (exception.stack ?? exception.message) : String(exception),
        );
      }
    }
    if (response.headersSent) {
      return;
    }
    if (result.retryAfter !== null) {
      response.setHeader("Retry-After", String(result.retryAfter));
    }
    response.status(result.status).json(result.body);
  }
}
