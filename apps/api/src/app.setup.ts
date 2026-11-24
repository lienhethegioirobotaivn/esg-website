import type { NestExpressApplication } from "@nestjs/platform-express";

export const API_PREFIX = "api/v1";

export function configureApp(app: NestExpressApplication): void {
  app.disable("x-powered-by");
  app.setGlobalPrefix(API_PREFIX);
  app.enableShutdownHooks();
}
