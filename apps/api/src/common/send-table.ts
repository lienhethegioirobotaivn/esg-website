import type { Response } from "express";

import type { TableFile } from "../table-export/table-export.js";

export function sendTableFile(response: Response, file: TableFile): void {
  response.setHeader("Content-Type", file.contentType);
  response.setHeader("Content-Disposition", `attachment; filename="${file.fileName}"`);
  response.setHeader("Cache-Control", "private, no-store");
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.status(200).send(file.buffer);
}
