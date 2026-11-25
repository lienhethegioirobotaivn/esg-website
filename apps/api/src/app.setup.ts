import type { NestExpressApplication } from "@nestjs/platform-express";

import { AllExceptionsFilter } from "./common/all-exceptions.filter.js";
import { APP_ENV } from "./config/config.constants.js";
import type { AppEnv } from "./config/env.schema.js";

export const API_PREFIX = "api/v1";

export function configureApp(app: NestExpressApplication): void {
  const env = app.get<AppEnv>(APP_ENV);
  app.disable("x-powered-by");
  if (env.TRUSTED_PROXY > 0) {
    app.set("trust proxy", env.TRUSTED_PROXY);
  }
  app.useBodyParser("json", { limit: "1mb" });
  app.setGlobalPrefix(API_PREFIX);
  app.useGlobalFilters(new AllExceptionsFilter());
  app.enableShutdownHooks();
}
