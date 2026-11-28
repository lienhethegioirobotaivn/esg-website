import {
  BANK_SOURCES,
  type BankDetail,
  type BankEvidenceRule,
  type BankQuestionView,
  type BankSummary,
} from "@esg/shared/node";
import { eq, ne, sql } from "drizzle-orm";

import { AppError } from "../common/app-error.js";
import { questionBanks, questions, reports } from "../database/schema/index.js";
import { codePrefix } from "./bank-layout.js";
import { loadStoredBank, type BankReader, type StoredQuestion } from "./bank-records.js";
import { REPORT_DEPENDENT_CODES } from "./question-bank.constants.js";

export const BANK_NOT_FOUND = "Không tìm thấy phiên bản bộ câu hỏi.";

export async function bankSummaries(db: BankReader, bankId?: string): Promise<BankSummary[]> {
  const rows = await db
    .select({
      id: questionBanks.id,
      version: questionBanks.version,
      status: questionBanks.status,
      note: questionBanks.note,
      publishedAt: questionBanks.publishedAt,
      createdAt: questionBanks.createdAt,
      updatedAt: questionBanks.updatedAt,
    })
    .from(questionBanks)
    .where(bankId === undefined ? undefined : eq(questionBanks.id, bankId))
    .orderBy(sql`${questionBanks.createdAt} desc`);
  const counts = await db
    .select({
      bankId: questions.bankId,
      status: questions.reviewStatus,
      total: sql<number>`count(*)::int`,
    })
    .from(questions)
    .groupBy(questions.bankId, questions.reviewStatus);
  const usage = await db
    .select({ bankId: reports.bankVersionId, total: sql<number>`count(*)::int` })
    .from(reports)
    .groupBy(reports.bankVersionId);

  return rows.map((row) => {
    const summary = { total: 0, pending: 0, changes: 0, approved: 0, rejected: 0 };
    for (const count of counts) {
      if (count.bankId === row.id) {
        summary[count.status] += count.total;
        summary.total += count.total;
      }
    }
    return {
      ...row,
      publishedAt: row.publishedAt === null ? null : row.publishedAt.toISOString(),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      counts: summary,
      reports: usage.find((item) => item.bankId === row.id)?.total ?? 0,
    };
  });
}

export async function lockedCodes(db: BankReader): Promise<ReadonlySet<string>> {
  const rows = await db
    .select({ code: questions.code })
    .from(questions)
    .innerJoin(questionBanks, eq(questionBanks.id, questions.bankId))
    .where(ne(questionBanks.status, "draft"));
  return new Set(rows.map((row) => row.code));
}

export async function nextCodes(db: BankReader): Promise<BankDetail["nextCodes"]> {
  const rows = await db.select({ code: questions.code }).from(questions);
  return Object.fromEntries(
    BANK_SOURCES.map((source) => {
      const prefix = codePrefix(source);
      let highest = 0;
      for (const row of rows) {
        if (row.code.startsWith(`${prefix}-`)) {
          highest = Math.max(highest, Number(row.code.slice(prefix.length + 1)) || 0);
        }
      }
      return [source, `${prefix}-${String(highest + 1).padStart(3, "0")}`];
    }),
  ) as BankDetail["nextCodes"];
}

function questionView(
  question: StoredQuestion,
  groupCode: string,
  locked: ReadonlySet<string>,
): BankQuestionView {
  const capabilities = question.route["capability_any"];
  return {
    id: question.id,
    code: question.code,
    source: question.source,
    groupCode,
    position: question.position,
    pillar: question.pillar,
    topic: question.topic ?? "",
    text: question.text,
    guidance: question.guidance ?? "",
    evidenceHint: question.evidenceHint ?? "",
    improvementHint: question.improvementHint ?? "",
    inputType: question.inputType,
    unit: question.unit ?? "",
    required: question.required,
    declarationLevel: question.declarationLevel,
    capabilities: Array.isArray(capabilities) ? capabilities.map(String) : [],
    reportSection: question.reportSection ?? "",
    sourceRef: question.sourceRef ?? "",
    reviewStatus: question.reviewStatus,
    reviewNote: question.reviewNote ?? "",
    reviewedBy: question.reviewedBy ?? "",
    reviewedOn: question.reviewedOn ?? "",
    rolloutStatus: question.rolloutStatus,
    evidenceRule: question.evidenceRule as BankEvidenceRule | null,
    isNew: !locked.has(question.code),
    usedByReport: REPORT_DEPENDENT_CODES.includes(question.code),
  };
}

export async function bankDetail(db: BankReader, bankId: string): Promise<BankDetail> {
  const [bank] = await bankSummaries(db, bankId);
  if (bank === undefined) {
    throw new AppError(404, "bank_not_found", BANK_NOT_FOUND);
  }
  const stored = await loadStoredBank(db, bankId);
  const locked = await lockedCodes(db);
  const groupCodes = new Map(stored.groups.map((group) => [group.id, group.code]));
  return {
    bank,
    groups: stored.groups.map((group) => ({
      code: group.code,
      title: group.title,
      position: group.position,
    })),
    questions: stored.questions.map((question) =>
      questionView(question, groupCodes.get(question.groupId) ?? "", locked),
    ),
    nextCodes: await nextCodes(db),
  };
}
