import { sql } from "drizzle-orm";
import { check, index, integer, pgTable, text, uuid } from "drizzle-orm/pg-core";

import { users } from "./auth.js";
import { createdAt, oneOf, timestamptz, uuidPk } from "./columns.js";
import { FILE_KINDS, type FileKind } from "./enums.js";

export const files = pgTable(
  "files",
  {
    id: uuidPk(),
    storageKey: text().notNull().unique("files_storage_key_key"),
    kind: text().$type<FileKind>().notNull(),
    mime: text().notNull(),
    size: integer().notNull(),
    sha256: text().notNull(),
    ownerUserId: uuid().references(() => users.id, { onDelete: "set null" }),
    originalName: text(),
    referencedAt: timestamptz(),
    deletedAt: timestamptz(),
    createdAt: createdAt(),
  },
  (t) => [
    check("files_kind_check", oneOf(t.kind, FILE_KINDS)),
    check("files_size_check", sql`${t.size} >= 0`),
    check("files_sha256_check", sql`${t.sha256} ~ '^[0-9a-f]{64}$'`),
    index("files_owner_user_id_idx").on(t.ownerUserId),
    index("files_unreferenced_idx")
      .on(t.createdAt)
      .where(sql`${t.referencedAt} is null and ${t.deletedAt} is null`),
    index("files_deleted_at_idx")
      .on(t.deletedAt)
      .where(sql`${t.deletedAt} is not null`),
  ],
);
