import type { BankCheckResult, BankDetail, BankImportResult, BankSummary } from "@esg/shared/node";
import { Inject, Injectable } from "@nestjs/common";
import { eq, sql } from "drizzle-orm";

import type { AdminIdentity } from "../admin/admin.types.js";
import { AuditService } from "../audit/audit.service.js";
import { AppError } from "../common/app-error.js";
import { isUniqueViolation } from "../common/db-errors.js";
import type { Database } from "../database/client.js";
import { DATABASE } from "../database/database.constants.js";
import { questionBanks, questionGroups, questionTexts, questions } from "../database/schema/index.js";
import type { TableFile } from "../table-export/table-export.js";
import type { CreateBankInput, ImportBankInput, UpdateBankInput } from "./bank-admin.schemas.js";
import { checkStoredBank, compareBanks } from "./bank-check.js";
import { writeBankWorkbook } from "./bank-export.js";
import { loadStoredBank, toParsedBank, type BankReader } from "./bank-records.js";
import { BANK_NOT_FOUND, bankDetail, bankSummaries } from "./bank-view.js";
import { checkQuestionBank } from "./import-question-bank.js";
import { QuestionBankImporter } from "./question-bank-importer.js";
import { hasErrors } from "./validate-question-bank.js";

const XLSX_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const INSERT_CHUNK = 500;

function omit<T extends object, K extends keyof T>(value: T, keys: readonly K[]): Omit<T, K> {
  const copy = { ...value };
  for (const key of keys) {
    delete copy[key];
  }
  return copy;
}

function chunks<T>(list: readonly T[]): T[][] {
  const result: T[][] = [];
  for (let start = 0; start < list.length; start += INSERT_CHUNK) {
    result.push(list.slice(start, start + INSERT_CHUNK));
  }
  return result;
}

function nextVersion(base: string, used: ReadonlySet<string>): string {
  const clean = base.replace(/-draft$/i, "");
  const match = /^(.*?)(\d+)(\D*)$/.exec(clean);
  const prefix = match?.[1] ?? `${clean}.`;
  let number = Number(match?.[2] ?? 0);
  let candidate = "";
  do {
    number += 1;
    candidate = `${prefix}${number}`.slice(-30);
  } while (used.has(candidate));
  return candidate;
}

@Injectable()
export class BankAdminService {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  async list(): Promise<{ banks: BankSummary[] }> {
    return { banks: await bankSummaries(this.db) };
  }

  detail(bankId: string): Promise<BankDetail> {
    return bankDetail(this.db, bankId);
  }

  async createDraft(input: CreateBankInput, admin: AdminIdentity, ip: string): Promise<BankDetail> {
    const bankId = await this.db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext('question-bank:import'))`);
      const banks = await tx
        .select({ id: questionBanks.id, version: questionBanks.version, status: questionBanks.status })
        .from(questionBanks);
      const source =
        input.fromId === undefined
          ? banks.find((bank) => bank.status === "published")
          : banks.find((bank) => bank.id === input.fromId);
      if (source === undefined) {
        throw new AppError(
          input.fromId === undefined ? 409 : 404,
          "bank_not_found",
          input.fromId === undefined
            ? "Chưa có phiên bản đang xuất bản. Hãy chọn một phiên bản để nhân bản hoặc nhập file Excel."
            : BANK_NOT_FOUND,
        );
      }
      const used = new Set(banks.map((bank) => bank.version));
      const version = input.version ?? nextVersion(source.version, used);
      if (used.has(version)) {
        throw new AppError(409, "version_taken", `Số phiên bản ${version} đã tồn tại.`);
      }
      const [created] = await tx
        .insert(questionBanks)
        .values({ version, status: "draft", note: input.note ?? null })
        .returning({ id: questionBanks.id });
      if (created === undefined) {
        throw new Error("Không tạo được phiên bản bộ câu hỏi.");
      }

      const stored = await loadStoredBank(tx, source.id);
      const groupIds = new Map<string, string>();
      for (const group of stored.groups) {
        const [copy] = await tx
          .insert(questionGroups)
          .values({
            bankId: created.id,
            code: group.code,
            title: group.title,
            position: group.position,
            track: group.track,
          })
          .returning({ id: questionGroups.id });
        groupIds.set(group.id, copy?.id as string);
      }
      const questionIds = new Map<string, string>();
      for (const part of chunks(stored.questions)) {
        const copies = await tx
          .insert(questions)
          .values(
            part.map((question) => ({
              ...omit(question, ["id", "createdAt", "updatedAt"]),
              bankId: created.id,
              groupId: groupIds.get(question.groupId) as string,
            })),
          )
          .returning({ id: questions.id, code: questions.code });
        for (const copy of copies) {
          questionIds.set(copy.code, copy.id);
        }
      }
      const texts = await tx
        .select({
          code: questions.code,
          locale: questionTexts.locale,
          text: questionTexts.text,
          guidance: questionTexts.guidance,
        })
        .from(questionTexts)
        .innerJoin(questions, eq(questions.id, questionTexts.questionId))
        .where(eq(questions.bankId, source.id));
      for (const part of chunks(texts)) {
        await tx.insert(questionTexts).values(
          part.map(({ code, ...text }) => ({ ...text, questionId: questionIds.get(code) as string })),
        );
      }
      await this.record(tx, "question_bank.create", created.id, admin, ip, {
        version,
        from: source.version,
      });
      return created.id;
    });
    return bankDetail(this.db, bankId);
  }

  async importFile(
    buffer: Buffer,
    input: ImportBankInput,
    admin: AdminIdentity,
    ip: string,
  ): Promise<BankImportResult> {
    let checked: Awaited<ReturnType<typeof checkQuestionBank>>;
    try {
      checked = await checkQuestionBank(buffer, input.version);
    } catch {
      throw new AppError(400, "invalid_file", "Không đọc được file. Hãy chọn đúng file Excel (.xlsx).");
    }
    const { bank, issues } = checked;
    const version = bank.version;
    let replacesDraft = false;
    if (version !== null) {
      const [existing] = await this.db
        .select({ status: questionBanks.status })
        .from(questionBanks)
        .where(eq(questionBanks.version, version));
      replacesDraft = existing?.status === "draft";
      if (existing !== undefined && existing.status !== "draft") {
        issues.push({
          severity: "error",
          tab: "",
          row: null,
          code: null,
          message: `Phiên bản ${version} đã xuất bản hoặc lưu trữ nên không ghi đè được. Hãy nhập số phiên bản khác.`,
        });
      }
    }
    const result: BankImportResult = {
      ok: !hasErrors(issues) && version !== null,
      imported: false,
      issues,
      version,
      questions: bank.questions.length,
      groups: bank.groups.length,
      replacesDraft,
      bankId: null,
    };
    if (input.dryRun || !result.ok || version === null) {
      return result;
    }
    const summary = await new QuestionBankImporter(this.db).importBank(bank, {
      version,
      publish: false,
      ...(input.note === undefined ? {} : { note: input.note }),
    });
    await this.record(this.db, "question_bank.import", summary.bankId, admin, ip, {
      version,
      questions: summary.questions,
    });
    return { ...result, imported: true, bankId: summary.bankId };
  }

  async exportFile(bankId: string): Promise<TableFile> {
    const bank = await this.find(this.db, bankId);
    const stored = await loadStoredBank(this.db, bankId);
    return {
      buffer: await writeBankWorkbook(toParsedBank(bank.version, stored)),
      contentType: XLSX_TYPE,
      fileName: `bo-cau-hoi-${bank.version}.xlsx`,
    };
  }

  async update(
    bankId: string,
    input: UpdateBankInput,
    admin: AdminIdentity,
    ip: string,
  ): Promise<BankDetail> {
    try {
      await this.db.transaction(async (tx) => {
        const bank = await this.find(tx, bankId);
        if (bank.status !== "draft") {
          throw new AppError(409, "bank_locked", "Chỉ sửa được bản nháp.");
        }
        await tx
          .update(questionBanks)
          .set({ ...input, updatedAt: sql`now()` })
          .where(eq(questionBanks.id, bankId));
        await this.record(tx, "question_bank.update", bankId, admin, ip, { ...input });
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new AppError(409, "version_taken", `Số phiên bản ${input.version ?? ""} đã tồn tại.`);
      }
      throw error;
    }
    return bankDetail(this.db, bankId);
  }

  async remove(bankId: string, admin: AdminIdentity, ip: string): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext('question-bank:import'))`);
      const bank = await this.find(tx, bankId);
      if (bank.status !== "draft") {
        throw new AppError(409, "bank_locked", "Chỉ xóa được bản nháp.");
      }
      await tx.delete(questionBanks).where(eq(questionBanks.id, bankId));
      await this.record(tx, "question_bank.delete", bankId, admin, ip, { version: bank.version });
    });
  }

  async check(bankId: string): Promise<BankCheckResult> {
    return this.checkWith(this.db, bankId);
  }

  async publish(bankId: string, admin: AdminIdentity, ip: string): Promise<BankDetail> {
    await this.db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext('question-bank:import'))`);
      const bank = await this.find(tx, bankId);
      if (bank.status === "published") {
        throw new AppError(409, "already_published", "Phiên bản này đang được xuất bản.");
      }
      const result = await this.checkWith(tx, bankId);
      if (!result.ok) {
        const total = result.issues.filter((issue) => issue.severity === "error").length;
        throw new AppError(400, "bank_invalid", `Còn ${total} lỗi cần sửa trước khi xuất bản.`);
      }
      await tx
        .update(questionBanks)
        .set({ status: "archived", updatedAt: sql`now()` })
        .where(eq(questionBanks.status, "published"));
      await tx
        .update(questionBanks)
        .set({ status: "published", publishedAt: sql`now()`, updatedAt: sql`now()` })
        .where(eq(questionBanks.id, bankId));
      await this.record(tx, "question_bank.publish", bankId, admin, ip, {
        version: bank.version,
        previous: result.changes.comparedTo,
      });
    });
    return bankDetail(this.db, bankId);
  }

  private async checkWith(db: BankReader, bankId: string): Promise<BankCheckResult> {
    const bank = await this.find(db, bankId);
    const stored = await loadStoredBank(db, bankId);
    const issues = checkStoredBank(bank.version, stored);
    const [published] = await db
      .select({ id: questionBanks.id, version: questionBanks.version })
      .from(questionBanks)
      .where(eq(questionBanks.status, "published"));
    const previous =
      published === undefined || published.id === bankId
        ? null
        : await loadStoredBank(db, published.id);
    return {
      ok: !hasErrors(issues),
      issues,
      changes: compareBanks(
        previous === null ? null : (published?.version ?? null),
        previous?.questions ?? [],
        stored.questions,
      ),
    };
  }

  private async find(
    db: BankReader,
    bankId: string,
  ): Promise<{ version: string; status: string }> {
    const [bank] = await db
      .select({ version: questionBanks.version, status: questionBanks.status })
      .from(questionBanks)
      .where(eq(questionBanks.id, bankId));
    if (bank === undefined) {
      throw new AppError(404, "bank_not_found", BANK_NOT_FOUND);
    }
    return bank;
  }

  private record(
    executor: Pick<Database, "insert">,
    action: string,
    bankId: string,
    admin: AdminIdentity,
    ip: string,
    meta: Record<string, unknown>,
  ): Promise<void> {
    return this.audit.record(
      {
        actorType: "admin",
        actorId: admin.adminId,
        action,
        entity: "question_bank",
        entityId: bankId,
        meta,
        ip,
      },
      executor,
    );
  }
}
