import { Global, Module } from "@nestjs/common";

import { APP_ENV } from "../config/config.constants.js";
import type { AppEnv } from "../config/env.schema.js";
import { AdminTranslationsController } from "./admin-translations.controller.js";
import { ContentSourcesService } from "./content-sources.service.js";
import { GeminiTranslator } from "./gemini-translator.js";
import { TranslationAdminService } from "./translation-admin.service.js";
import { TranslationMemoryService } from "./translation-memory.service.js";
import { GEMINI_DEFAULT_BASE_URL } from "./translation.constants.js";
import { TranslationService } from "./translation.service.js";
import { TranslationsController } from "./translations.controller.js";
import { TRANSLATOR, type Translator } from "./translator.js";

@Global()
@Module({
  controllers: [TranslationsController, AdminTranslationsController],
  providers: [
    {
      provide: TRANSLATOR,
      inject: [APP_ENV],
      useFactory: (env: AppEnv): Translator | null =>
        env.GEMINI_API_KEY === undefined
          ? null
          : new GeminiTranslator({
              apiKey: env.GEMINI_API_KEY,
              model: env.GEMINI_MODEL,
              baseUrl: env.GEMINI_API_BASE_URL ?? GEMINI_DEFAULT_BASE_URL,
            }),
    },
    TranslationMemoryService,
    ContentSourcesService,
    TranslationAdminService,
    TranslationService,
  ],
  exports: [TranslationMemoryService, TranslationService],
})
export class TranslationModule {}
