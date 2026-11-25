import { Inject, Injectable } from "@nestjs/common";
import { and, asc, count, eq } from "drizzle-orm";

import type { AuthUser } from "../auth/auth.types.js";
import { AppError } from "../common/app-error.js";
import type { UploadedFile } from "../common/uploads.js";
import type { Database } from "../database/client.js";
import { DATABASE } from "../database/database.constants.js";
import { evidenceFiles, files, questions, reports } from "../database/schema/index.js";
import { FilesService, type OpenedFile } from "../files/files.service.js";
import { requireOwnedReport } from "../reports/owned-report.js";
import { MAX_EVIDENCE_PER_QUESTION } from "./evidence.constants.js";

export interface EvidenceItem {
  id: string;
  questionCode: string;
  name: string | null;
  mime: string;
  size: number;
  createdAt: string;
}

const notFound = (): AppError => new AppError(404, "evidence_not_found", "Không tìm thấy tệp minh chứng.");

@Injectable()
export class EvidenceService {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    @Inject(FilesService) private readonly files: FilesService,
  ) {}

  async upload(
    user: AuthUser,
    input: { reportCode: string; questionCode: string; file: UploadedFile },
  ): Promise<EvidenceItem> {
    const report = await requireOwnedReport(this.db, input.reportCode, user.userId);

    const [question] = await this.db
      .select({ id: questions.id })
      .from(questions)
      .where(and(eq(questions.bankId, report.bankVersionId), eq(questions.code, input.questionCode)))
      .limit(1);
    if (question === undefined) {
      throw new AppError(400, "invalid_question", "Mã câu hỏi không tồn tại trong bộ câu hỏi của báo cáo.");
    }

    const [existing] = await this.db
      .select({ total: count() })
      .from(evidenceFiles)
      .where(and(eq(evidenceFiles.reportId, report.id), eq(evidenceFiles.questionCode, input.questionCode)));
    if ((existing?.total ?? 0) >= MAX_EVIDENCE_PER_QUESTION) {
      throw new AppError(409, "evidence_limit", `Mỗi câu hỏi chỉ đính kèm tối đa ${MAX_EVIDENCE_PER_QUESTION} tệp.`);
    }

    const stored = await this.files.upload({
      buffer: input.file.buffer,
      kind: "evidence",
      ownerUserId: user.userId,
      originalName: input.file.originalname,
    });
    try {
      return await this.db.transaction(async (tx) => {
        await tx.select({ id: reports.id }).from(reports).where(eq(reports.id, report.id)).for("update");
        const [again] = await tx
          .select({ total: count() })
          .from(evidenceFiles)
          .where(and(eq(evidenceFiles.reportId, report.id), eq(evidenceFiles.questionCode, input.questionCode)));
        if ((again?.total ?? 0) >= MAX_EVIDENCE_PER_QUESTION) {
          throw new AppError(409, "evidence_limit", `Mỗi câu hỏi chỉ đính kèm tối đa ${MAX_EVIDENCE_PER_QUESTION} tệp.`);
        }
        const [row] = await tx
          .insert(evidenceFiles)
          .values({
            reportId: report.id,
            questionCode: input.questionCode,
            fileId: stored.id,
            uploadedByUserId: user.userId,
          })
          .returning({ id: evidenceFiles.id, createdAt: evidenceFiles.createdAt });
        if (row === undefined) {
          throw new Error("Không ghi được minh chứng");
        }
        await this.files.markReferenced(tx, [stored.id]);
        return {
          id: row.id,
          questionCode: input.questionCode,
          name: input.file.originalname.slice(0, 200),
          mime: stored.mime,
          size: stored.size,
          createdAt: row.createdAt.toISOString(),
        };
      });
    } catch (error) {
      await this.files.markDeleted(this.db, [stored.id]).catch(() => undefined);
      throw error;
    }
  }

  async list(user: AuthUser, reportCode: string): Promise<{ evidence: EvidenceItem[] }> {
    const report = await requireOwnedReport(this.db, reportCode, user.userId);
    const rows = await this.db
      .select({
        id: evidenceFiles.id,
        questionCode: evidenceFiles.questionCode,
        name: files.originalName,
        mime: files.mime,
        size: files.size,
        createdAt: evidenceFiles.createdAt,
      })
      .from(evidenceFiles)
      .innerJoin(files, eq(files.id, evidenceFiles.fileId))
      .where(eq(evidenceFiles.reportId, report.id))
      .orderBy(asc(evidenceFiles.createdAt), asc(evidenceFiles.id));
    return { evidence: rows.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() })) };
  }

  async open(user: AuthUser, evidenceId: string): Promise<OpenedFile> {
    const row = await this.findOwned(user, evidenceId);
    const opened = await this.files.open(row.fileId);
    if (opened === null) {
      throw notFound();
    }
    return opened;
  }

  async remove(user: AuthUser, evidenceId: string): Promise<void> {
    const row = await this.findOwned(user, evidenceId);
    await this.db.transaction(async (tx) => {
      await tx.delete(evidenceFiles).where(eq(evidenceFiles.id, row.id));
      await this.files.markDeleted(tx, [row.fileId]);
    });
  }

  private async findOwned(user: AuthUser, evidenceId: string): Promise<{ id: string; fileId: string }> {
    const [row] = await this.db
      .select({ id: evidenceFiles.id, fileId: evidenceFiles.fileId })
      .from(evidenceFiles)
      .innerJoin(reports, eq(reports.id, evidenceFiles.reportId))
      .where(and(eq(evidenceFiles.id, evidenceId), eq(reports.ownerUserId, user.userId)))
      .limit(1);
    if (row === undefined) {
      throw notFound();
    }
    return row;
  }
}
