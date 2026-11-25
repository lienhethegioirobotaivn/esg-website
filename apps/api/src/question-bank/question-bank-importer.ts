import { eq, sql } from "drizzle-orm";

import type { Database } from "../database/client.js";
import { questionBanks, questionGroups, questions } from "../database/schema/index.js";
import type { ImportSummary, ParsedBank } from "./question-bank.types.js";

export class QuestionBankLockedError extends Error {
  constructor(version: string, status: string) {
    super(
      `Phiên bản ${version} đã ở trạng thái "${status}" nên không thể ghi đè. Hãy dùng số phiên bản mới.`,
    );
    this.name = "QuestionBankLockedError";
  }
}

export interface ImportOptions {
  readonly version: string;
  readonly publish: boolean;
  readonly note?: string;
}

export class QuestionBankImporter {
  constructor(private readonly db: Database) {}

  async importBank(bank: ParsedBank, options: ImportOptions): Promise<ImportSummary> {
    return this.db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext('question-bank:import'))`);

      const [existing] = await tx
        .select({ id: questionBanks.id, status: questionBanks.status })
        .from(questionBanks)
        .where(eq(questionBanks.version, options.version));

      let bankId: string;
      let replacedDraft = false;
      if (existing === undefined) {
        const [created] = await tx
          .insert(questionBanks)
          .values({ version: options.version, status: "draft", note: options.note ?? null })
          .returning({ id: questionBanks.id });
        if (created === undefined) {
          throw new Error("Không tạo được phiên bản bộ câu hỏi.");
        }
        bankId = created.id;
      } else if (existing.status === "draft") {
        bankId = existing.id;
        replacedDraft = true;
        await tx.delete(questionGroups).where(eq(questionGroups.bankId, bankId));
        await tx
          .update(questionBanks)
          .set({ note: options.note ?? null })
          .where(eq(questionBanks.id, bankId));
      } else {
        throw new QuestionBankLockedError(options.version, existing.status);
      }

      const insertedGroups = await tx
        .insert(questionGroups)
        .values(
          bank.groups.map((group) => ({
            bankId,
            code: group.code,
            title: group.title,
            position: group.position,
            track: group.track,
          })),
        )
        .returning({ id: questionGroups.id, code: questionGroups.code });
      const groupIds = new Map(insertedGroups.map((group) => [group.code, group.id]));

      await tx.insert(questions).values(
        bank.questions.map((question) => {
          const groupId = groupIds.get(question.saveGroup);
          if (groupId === undefined) {
            throw new Error(`Không tìm thấy nhóm ${question.saveGroup} cho câu ${question.code}.`);
          }
          return {
            bankId,
            groupId,
            code: question.code,
            source: question.source,
            pillar: question.pillar,
            topic: question.topic === "" ? null : question.topic,
            inputType: question.inputType,
            unit: question.unit,
            required: question.required,
            text: question.text,
            guidance: question.guidance,
            evidenceHint: question.evidenceHint,
            improvementHint: question.improvementHint,
            reportSection: question.reportSection,
            declarationLevel: question.declarationLevel,
            route: question.route,
            evidenceRule: question.evidenceRule,
            reviewStatus: question.reviewStatus,
            position: question.position,
            sourceRef: question.sourceRef,
          };
        }),
      );

      let archivedVersion: string | null = null;
      if (options.publish) {
        const [previous] = await tx
          .update(questionBanks)
          .set({ status: "archived" })
          .where(eq(questionBanks.status, "published"))
          .returning({ version: questionBanks.version });
        archivedVersion = previous?.version ?? null;
        await tx
          .update(questionBanks)
          .set({ status: "published", publishedAt: new Date() })
          .where(eq(questionBanks.id, bankId));
      }

      const approved = bank.questions.filter((question) => question.reviewStatus === "approved").length;
      return {
        bankId,
        version: options.version,
        status: options.publish ? "published" : "draft",
        groups: bank.groups.length,
        questions: bank.questions.length,
        approved,
        pending: bank.questions.length - approved,
        replacedDraft,
        archivedVersion,
      };
    });
  }
}
