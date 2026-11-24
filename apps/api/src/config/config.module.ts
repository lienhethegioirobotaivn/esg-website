import { Global, Module } from "@nestjs/common";

import { APP_ENV } from "./config.constants.js";
import { loadEnv } from "./env.schema.js";

@Global()
@Module({
  providers: [
    {
      provide: APP_ENV,
      useFactory: () => loadEnv(process.env),
    },
  ],
  exports: [APP_ENV],
})
export class ConfigModule {}
