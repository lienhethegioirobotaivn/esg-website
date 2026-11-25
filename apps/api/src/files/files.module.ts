import { Global, Module } from "@nestjs/common";

import { FilesService } from "./files.service.js";
import { StorageService } from "./storage.service.js";

@Global()
@Module({
  providers: [StorageService, FilesService],
  exports: [StorageService, FilesService],
})
export class FilesModule {}
