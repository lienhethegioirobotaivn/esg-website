import { index, pgTable, text, unique, uuid } from "drizzle-orm/pg-core";

import { users } from "./auth.js";
import { createdAt, uuidPk } from "./columns.js";
import { files } from "./files.js";
import { reports } from "./reports.js";

export const evidenceFiles = pgTable(
  "evidence_files",
  {
    id: uuidPk(),
    reportId: uuid()
      .notNull()
      .references(() => reports.id, { onDelete: "cascade" }),
    questionCode: text().notNull(),
    fileId: uuid()
      .notNull()
      .references(() => files.id, { onDelete: "cascade" }),
    uploadedByUserId: uuid().references(() => users.id, { onDelete: "set null" }),
    createdAt: createdAt(),
  },
  (t) => [
    unique("evidence_files_report_question_file_key").on(t.reportId, t.questionCode, t.fileId),
    index("evidence_files_file_id_idx").on(t.fileId),
  ],
);
