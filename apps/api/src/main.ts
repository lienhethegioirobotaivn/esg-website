import "reflect-metadata";

import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";

import { AppModule } from "./app.module.js";
import { configureApp } from "./app.setup.js";
import { EnvValidationError, loadEnv } from "./config/env.schema.js";
import { loadEnvFile } from "./config/load-env-file.js";

async function bootstrap(): Promise<void> {
  loadEnvFile();
  const env = loadEnv(process.env);
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  configureApp(app);
  await app.listen(env.PORT);
  new Logger("Bootstrap").log(`API đang chạy tại cổng ${env.PORT}`);
}

bootstrap().catch((error: unknown) => {
  if (error instanceof EnvValidationError) {
    console.error(error.message);
  } else {
    console.error("API không khởi động được:", error);
  }
  process.exit(1);
});
