import { BANK_AI_CASE_FIELDS, INPUT_TYPES, type BankDetail, type BankEvidenceRule } from "@esg/shared/node";
import { Inject, Injectable } from "@nestjs/common";
import { and, eq, inArray, notInArray, sql } from "drizzle-orm";

import type { AdminIdentity } from "../admin/admin.types.js";
import { AuditService } from "../audit/audit.service.js";
import { AppError } from "../common/app-error.js";
import type { Database } from "../database/client.js";
import { DATABASE } from "../database/database.constants.js";
import {
  questionBanks,
  questionGroups,
  questionTexts,
  questions,
  type QuestionSource,
} from "../database/schema/index.js";
import type {
  BulkQuestionInput,
  CreateQuestionInput,
  ReorderInput,
  UpdateQuestionInput,
} from "./bank-admin.schemas.js";
import { codePrefix, planLayout } from "./bank-layout.js";
import { loadStoredBank, type StoredBank, type StoredQuestion } from "./bank-records.js";
import { BANK_NOT_FOUND, bankDetail, lockedCodes, nextCodes } from "./bank-view.js";
import { BANK_TABS } from "./question-bank.constants.js";

type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];

interface Slot {
  readonly key: string;
  readonly source: QuestionSource;
  readonly groupId: string | null;
  readonly topic: string;
}

interface Placement {
  readonly groupId: string;
  readonly position: number;
}

const QUESTION_NOT_FOUND = "Không tìm thấy câu hỏi trong phiên bản này.";

const DEFAULT_EVIDENCE_CODES: Readonly<Record<string, string>> = {
  PRACTICE: "EV-PRACTICE",
  INCIDENT: "EV-INCIDENT",
  NUMBER: "EV-DATA",
  INTEGER: "EV-DATA",
};

function today(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(new Date());
}

function orNull(value: string | undefined): string | null {
  return value === undefined || value === "" ? null : value;
}

function trackOf(source: QuestionSource): string {
  return BANK_TABS.find((tab) => tab.source === source)?.track ?? "core";
}

function slotOf(question: StoredQuestion): Slot {
  return {
    key: question.id,
    source: question.source,
    groupId: question.groupId,
    topic: question.topic ?? "",
  };
}

function assertFits(source: QuestionSource, pillar: string | null, inputType: string): void {
  if (source === "PROFILE") {
    return;
  }
  if (pillar === null) {
    throw new AppError(400, "pillar_required", "Hãy chọn trụ cột E, S hoặc G cho câu hỏi.");
  }
  if (!INPUT_TYPES.some((type) => type === inputType)) {
    throw new AppError(400, "invalid_input_type", "Loại trả lời này chỉ dùng cho tab Hồ sơ.");
  }
}

function assertCode(source: QuestionSource, code: string): void {
  const prefix = codePrefix(source);
  if (!new RegExp(`^${prefix}-\\d{3}$`).test(code)) {
    throw new AppError(400, "invalid_code", `Mã câu ở tab này phải có dạng ${prefix}-001.`);
  }
}

function cleanEvidence(
  rule: BankEvidenceRule,
  others: readonly StoredQuestion[],
): Record<string, unknown> {
  const { testCases, ...fields } = rule;
  const result: Record<string, unknown> = Object.fromEntries(
    Object.entries(fields).filter(([, value]) => value !== undefined && value !== ""),
  );
  let highest = 0;
  const everyCase = [
    ...others.flatMap(
      (question) => (question.evidenceRule as BankEvidenceRule | null)?.testCases ?? [],
    ),
    ...(testCases ?? []),
  ];
  for (const testCase of everyCase) {
    highest = Math.max(highest, Number(/^AI-(\d+)$/.exec(testCase.id ?? "")?.[1] ?? 0));
  }
  const kept = (testCases ?? [])
    .filter((testCase) =>
      BANK_AI_CASE_FIELDS.some(([key]) => key !== "id" && (testCase[key] ?? "") !== ""),
    )
    .map((testCase) => {
      const cleaned = Object.fromEntries(
        Object.entries(testCase).filter(([, value]) => value !== undefined && value !== ""),
      );
      if (!/^AI-\d+$/.test(testCase.id ?? "")) {
        highest += 1;
        cleaned["id"] = `AI-${String(highest).padStart(3, "0")}`;
      }
      return cleaned;
    });
  if (kept.length > 0) {
    result["testCases"] = kept;
  }
  return result;
}

@Injectable()
export class BankQuestionsService {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  add(
    bankId: string,
    input: CreateQuestionInput,
    admin: AdminIdentity,
    ip: string,
  ): Promise<BankDetail> {
    return this.edit(bankId, async (tx, stored) => {
      const { source } = input;
      const code = input.code ?? (await nextCodes(tx))[source];
      assertCode(source, code);
      if (stored.questions.some((question) => question.code === code)) {
        throw new AppError(409, "code_taken", `Mã câu ${code} đã có trong phiên bản này.`);
      }
      const inputType = input.inputType ?? (source === "PROFILE" ? "TEXT" : "PRACTICE");
      const pillar = source === "PROFILE" ? null : (input.pillar ?? null);
      assertFits(source, pillar, inputType);

      const sibling = stored.questions.find((question) => question.source === source);
      const siblingCapabilities = sibling?.route["capability_any"];
      const capabilities =
        input.capabilities ??
        (Array.isArray(siblingCapabilities) ? siblingCapabilities.map(String) : []);

      const slots = stored.questions.map(slotOf);
      const fresh: Slot = { key: "new", source, groupId: null, topic: input.topic ?? "" };
      if (input.afterId === undefined) {
        slots.push(fresh);
      } else if (input.afterId === null) {
        slots.unshift(fresh);
      } else {
        const index = slots.findIndex((slot) => slot.key === input.afterId && slot.source === source);
        if (index < 0) {
          throw new AppError(400, "invalid_position", "Vị trí chèn không thuộc tab này.");
        }
        slots.splice(index + 1, 0, fresh);
      }
      const placements = await this.relayout(tx, bankId, stored, slots);
      const place = placements.get("new") as Placement;
      const reviewStatus = input.reviewStatus ?? "pending";
      const approved = reviewStatus === "approved";
      const evidence = input.evidenceRule ?? {
        code: (DEFAULT_EVIDENCE_CODES[inputType] ?? "EV-OPTIONAL") as BankEvidenceRule["code"],
      };

      await tx.insert(questions).values({
        bankId,
        groupId: place.groupId,
        position: place.position,
        code,
        source,
        pillar,
        topic: orNull(input.topic),
        text: input.text,
        guidance: orNull(input.guidance),
        evidenceHint: orNull(input.evidenceHint),
        improvementHint: orNull(input.improvementHint),
        inputType,
        unit: orNull(input.unit),
        required: input.required ?? true,
        declarationLevel: input.declarationLevel ?? "basic",
        route:
          trackOf(source) === "sector"
            ? { sector_any: [source], capability_any: capabilities }
            : {},
        reportSection: orNull(input.reportSection),
        sourceRef: orNull(input.sourceRef),
        reviewStatus,
        reviewNote: orNull(input.reviewNote),
        reviewedBy: orNull(input.reviewedBy) ?? (approved ? admin.name : null),
        reviewedOn: orNull(input.reviewedOn) ?? (approved ? today() : null),
        rolloutStatus: input.rolloutStatus ?? "not_started",
        evidenceRule: cleanEvidence(evidence, stored.questions),
      });
      await this.finish(tx, bankId, placements, "question_bank.question_add", admin, ip, { code });
    });
  }

  update(
    bankId: string,
    questionId: string,
    input: UpdateQuestionInput,
    admin: AdminIdentity,
    ip: string,
  ): Promise<BankDetail> {
    return this.edit(bankId, async (tx, stored) => {
      const current = stored.questions.find((question) => question.id === questionId);
      if (current === undefined) {
        throw new AppError(404, "question_not_found", QUESTION_NOT_FOUND);
      }
      const code = input.code ?? current.code;
      if (code !== current.code) {
        if ((await lockedCodes(tx)).has(current.code)) {
          throw new AppError(
            409,
            "code_locked",
            "Mã câu đã từng xuất bản nên không đổi được, vì câu trả lời được lưu theo mã.",
          );
        }
        assertCode(current.source, code);
        if (stored.questions.some((question) => question.code === code)) {
          throw new AppError(409, "code_taken", `Mã câu ${code} đã có trong phiên bản này.`);
        }
      }
      const inputType = input.inputType ?? current.inputType;
      const pillar =
        current.source === "PROFILE" ? null : input.pillar === undefined ? current.pillar : input.pillar;
      assertFits(current.source, pillar, inputType);

      const reviewStatus = input.reviewStatus ?? current.reviewStatus;
      const newlyApproved = reviewStatus === "approved" && current.reviewStatus !== "approved";
      const optional = (value: string | undefined, previous: string | null): string | null =>
        value === undefined ? previous : orNull(value);

      const next = {
        code,
        pillar,
        topic: optional(input.topic, current.topic),
        text: input.text ?? current.text,
        guidance: optional(input.guidance, current.guidance),
        evidenceHint: optional(input.evidenceHint, current.evidenceHint),
        improvementHint: optional(input.improvementHint, current.improvementHint),
        inputType,
        unit: optional(input.unit, current.unit),
        required: input.required ?? current.required,
        declarationLevel: input.declarationLevel ?? current.declarationLevel,
        route:
          input.capabilities !== undefined && trackOf(current.source) === "sector"
            ? { sector_any: [current.source], capability_any: input.capabilities }
            : current.route,
        reportSection: optional(input.reportSection, current.reportSection),
        sourceRef: optional(input.sourceRef, current.sourceRef),
        reviewStatus,
        reviewNote: optional(input.reviewNote, current.reviewNote),
        reviewedBy:
          input.reviewedBy === undefined && newlyApproved
            ? admin.name
            : optional(input.reviewedBy, current.reviewedBy),
        reviewedOn:
          input.reviewedOn === undefined && newlyApproved
            ? today()
            : optional(input.reviewedOn, current.reviewedOn),
        rolloutStatus: input.rolloutStatus ?? current.rolloutStatus,
        evidenceRule:
          input.evidenceRule === undefined
            ? current.evidenceRule
            : cleanEvidence(
                input.evidenceRule,
                stored.questions.filter((question) => question.id !== questionId),
              ),
      };
      await tx
        .update(questions)
        .set({ ...next, updatedAt: sql`now()` })
        .where(eq(questions.id, questionId));
      if (next.text !== current.text || next.guidance !== current.guidance) {
        await tx.delete(questionTexts).where(eq(questionTexts.questionId, questionId));
      }
      const slots = stored.questions.map((question) =>
        question.id === questionId
          ? { ...slotOf(question), topic: next.topic ?? "" }
          : slotOf(question),
      );
      const placements = await this.relayout(tx, bankId, stored, slots);
      await this.finish(tx, bankId, placements, "question_bank.question_update", admin, ip, {
        code,
        fields: Object.keys(input),
      });
    });
  }

  bulk(
    bankId: string,
    input: BulkQuestionInput,
    admin: AdminIdentity,
    ip: string,
  ): Promise<BankDetail> {
    return this.edit(bankId, async (tx, stored) => {
      const chosen = this.pick(stored, input.ids);
      await tx
        .update(questions)
        .set({ ...input.patch, updatedAt: sql`now()` })
        .where(inArray(questions.id, input.ids));
      if (input.patch.reviewStatus === "approved") {
        const fresh = chosen
          .filter((question) => question.reviewStatus !== "approved")
          .map((question) => question.id);
        if (fresh.length > 0) {
          await tx
            .update(questions)
            .set({ reviewedBy: admin.name, reviewedOn: today() })
            .where(inArray(questions.id, fresh));
        }
      }
      await this.finish(tx, bankId, new Map(), "question_bank.question_bulk", admin, ip, {
        codes: chosen.map((question) => question.code),
        patch: input.patch,
      });
    });
  }

  remove(
    bankId: string,
    ids: readonly string[],
    admin: AdminIdentity,
    ip: string,
  ): Promise<BankDetail> {
    return this.edit(bankId, async (tx, stored) => {
      const chosen = this.pick(stored, ids);
      await tx.delete(questions).where(inArray(questions.id, [...ids]));
      const slots = stored.questions.filter((question) => !ids.includes(question.id)).map(slotOf);
      const placements = await this.relayout(tx, bankId, stored, slots);
      await this.finish(tx, bankId, placements, "question_bank.question_delete", admin, ip, {
        codes: chosen.map((question) => question.code),
      });
    });
  }

  reorder(bankId: string, input: ReorderInput, admin: AdminIdentity, ip: string): Promise<BankDetail> {
    return this.edit(bankId, async (tx, stored) => {
      const own = stored.questions.filter((question) => question.source === input.source);
      const byId = new Map(own.map((question) => [question.id, question]));
      const unique = new Set(input.ids);
      if (
        unique.size !== own.length ||
        input.ids.length !== own.length ||
        !input.ids.every((id) => byId.has(id))
      ) {
        throw new AppError(
          409,
          "order_outdated",
          "Danh sách câu đã thay đổi. Hãy tải lại trang rồi sắp xếp lại.",
        );
      }
      const slots = [
        ...stored.questions.filter((question) => question.source !== input.source),
        ...input.ids.map((id) => byId.get(id) as StoredQuestion),
      ].map(slotOf);
      const placements = await this.relayout(tx, bankId, stored, slots);
      await this.finish(tx, bankId, placements, "question_bank.reorder", admin, ip, {
        source: input.source,
      });
    });
  }

  private async edit(
    bankId: string,
    change: (tx: Transaction, stored: StoredBank) => Promise<void>,
  ): Promise<BankDetail> {
    await this.db.transaction(async (tx) => {
      const [bank] = await tx
        .select({ status: questionBanks.status })
        .from(questionBanks)
        .where(eq(questionBanks.id, bankId))
        .for("update");
      if (bank === undefined) {
        throw new AppError(404, "bank_not_found", BANK_NOT_FOUND);
      }
      if (bank.status !== "draft") {
        throw new AppError(409, "bank_locked", "Chỉ sửa được bản nháp. Hãy tạo bản nháp mới để chỉnh sửa.");
      }
      await change(tx, await loadStoredBank(tx, bankId));
    });
    return bankDetail(this.db, bankId);
  }

  private pick(stored: StoredBank, ids: readonly string[]): StoredQuestion[] {
    const chosen = stored.questions.filter((question) => ids.includes(question.id));
    if (chosen.length !== new Set(ids).size) {
      throw new AppError(404, "question_not_found", QUESTION_NOT_FOUND);
    }
    return chosen;
  }

  private async relayout(
    tx: Transaction,
    bankId: string,
    stored: StoredBank,
    slots: readonly Slot[],
  ): Promise<Map<string, Placement>> {
    const codes = new Map(stored.groups.map((group) => [group.id, group.code]));
    const layout = planLayout(
      slots.map((slot) => ({
        key: slot.key,
        source: slot.source,
        topic: slot.topic,
        groupCode: slot.groupId === null ? null : (codes.get(slot.groupId) ?? null),
      })),
      stored.groups.map((group) => group.code),
    );
    const groupIds = new Map(stored.groups.map((group) => [group.code, group.id]));
    for (const group of layout.groups) {
      const id = groupIds.get(group.code);
      const values = { title: group.title, position: group.position, track: group.track };
      if (id === undefined) {
        const [created] = await tx
          .insert(questionGroups)
          .values({ ...values, bankId, code: group.code })
          .returning({ id: questionGroups.id });
        groupIds.set(group.code, created?.id as string);
        continue;
      }
      const old = stored.groups.find((candidate) => candidate.id === id);
      if (old?.title !== group.title || old.position !== group.position) {
        await tx
          .update(questionGroups)
          .set({ ...values, updatedAt: sql`now()` })
          .where(eq(questionGroups.id, id));
      }
    }
    return new Map(
      [...layout.placements].map(([key, placement]) => [
        key,
        { groupId: groupIds.get(placement.groupCode) as string, position: placement.position },
      ]),
    );
  }

  private async finish(
    tx: Transaction,
    bankId: string,
    placements: ReadonlyMap<string, Placement>,
    action: string,
    admin: AdminIdentity,
    ip: string,
    meta: Record<string, unknown>,
  ): Promise<void> {
    for (const [id, placement] of placements) {
      if (id !== "new") {
        await tx
          .update(questions)
          .set(placement)
          .where(
            and(
              eq(questions.id, id),
              sql`(${questions.groupId}, ${questions.position}) is distinct from (${placement.groupId}::uuid, ${placement.position}::int)`,
            ),
          );
      }
    }
    const used = await tx
      .selectDistinct({ groupId: questions.groupId })
      .from(questions)
      .where(eq(questions.bankId, bankId));
    if (used.length > 0) {
      await tx.delete(questionGroups).where(
        and(
          eq(questionGroups.bankId, bankId),
          notInArray(
            questionGroups.id,
            used.map((row) => row.groupId),
          ),
        ),
      );
    } else {
      await tx.delete(questionGroups).where(eq(questionGroups.bankId, bankId));
    }
    await tx.update(questionBanks).set({ updatedAt: sql`now()` }).where(eq(questionBanks.id, bankId));
    await this.audit.record(
      {
        actorType: "admin",
        actorId: admin.adminId,
        action,
        entity: "question_bank",
        entityId: bankId,
        meta,
        ip,
      },
      tx,
    );
  }
}
