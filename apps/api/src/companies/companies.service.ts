import { Inject, Injectable } from "@nestjs/common";
import { and, desc, eq, sql } from "drizzle-orm";

import type { AuthUser } from "../auth/auth.types.js";
import { AppError } from "../common/app-error.js";
import { signToken } from "../common/signed-token.js";
import { APP_ENV } from "../config/config.constants.js";
import type { AppEnv } from "../config/env.schema.js";
import type { Database } from "../database/client.js";
import { DATABASE } from "../database/database.constants.js";
import {
  companies,
  consents,
  questionBanks,
  reports,
  type ConsentKind,
} from "../database/schema/index.js";
import { FilesService } from "../files/files.service.js";
import type { UploadedFile } from "../common/uploads.js";
import { CONSENT_FORM_VERSION, CONSENT_TEXT_VERSION } from "./companies.constants.js";
import {
  toCompanyColumns,
  type CompanyColumns,
  type CompanyFormInput,
} from "./company-mapper.js";
import { generateReportCode } from "../reports/report-code.js";

export interface SaveCompanyInput {
  form: CompanyFormInput;
  logo: UploadedFile | null;
  user: AuthUser | null;
}

export interface SaveCompanyResult {
  reportCode: string;
  claimToken: string | null;
}

const MAX_CODE_ATTEMPTS = 5;
const UNIQUE_VIOLATION = "23505";

function isUniqueViolation(error: unknown): boolean {
  let current: unknown = error;
  while (typeof current === "object" && current !== null) {
    if ((current as { code?: unknown }).code === UNIQUE_VIOLATION) {
      return true;
    }
    current = (current as { cause?: unknown }).cause;
  }
  return false;
}

@Injectable()
export class CompaniesService {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    @Inject(APP_ENV) private readonly env: AppEnv,
    @Inject(FilesService) private readonly files: FilesService,
  ) {}

  async save(input: SaveCompanyInput): Promise<SaveCompanyResult> {
    const columns = toCompanyColumns(input.form.profile);
    const logoId =
      input.logo === null
        ? null
        : (
            await this.files.upload({
              buffer: input.logo.buffer,
              kind: "logo",
              ownerUserId: input.user?.userId ?? null,
              originalName: input.logo.originalname,
            })
          ).id;

    try {
      const existing = await this.findExisting(input.form.reportCode);
      if (existing !== null) {
        return await this.update(existing, input, columns, logoId);
      }
      return await this.create(input, columns, logoId);
    } catch (error) {
      if (logoId !== null) {
        await this.files.markDeleted(this.db, [logoId]).catch(() => undefined);
      }
      throw error;
    }
  }

  private async findExisting(
    code: string | null,
  ): Promise<{ reportId: string; companyId: string; ownerUserId: string | null } | null> {
    if (code === null) {
      return null;
    }
    const [row] = await this.db
      .select({
        reportId: reports.id,
        companyId: reports.companyId,
        ownerUserId: reports.ownerUserId,
      })
      .from(reports)
      .where(eq(reports.code, code))
      .limit(1);
    return row ?? null;
  }

  private async update(
    existing: { reportId: string; companyId: string; ownerUserId: string | null },
    input: SaveCompanyInput,
    columns: CompanyColumns,
    logoId: string | null,
  ): Promise<SaveCompanyResult> {
    if (existing.ownerUserId !== null && existing.ownerUserId !== input.user?.userId) {
      throw new AppError(403, "forbidden", "Báo cáo này đã gắn với một email khác.");
    }
    const code = input.form.reportCode;
    if (code === null) {
      throw new Error("Thiếu mã báo cáo khi cập nhật");
    }

    await this.db.transaction(async (tx) => {
      const [current] = await tx
        .select({ logoFileId: companies.logoFileId })
        .from(companies)
        .where(eq(companies.id, existing.companyId))
        .for("update");

      await tx
        .update(companies)
        .set({
          ...columns,
          logoFileId: logoId ?? current?.logoFileId ?? null,
          updatedAt: sql`now()`,
        })
        .where(eq(companies.id, existing.companyId));

      if (logoId !== null) {
        await this.files.markReferenced(tx, [logoId]);
        if (current?.logoFileId !== null && current?.logoFileId !== undefined) {
          await this.files.markDeleted(tx, [current.logoFileId]);
        }
      }
      await this.recordConsents(tx, existing.companyId, input.form);
      await tx
        .update(reports)
        .set({ updatedAt: sql`now()` })
        .where(eq(reports.id, existing.reportId));
    });

    return this.result(code, existing.ownerUserId);
  }

  private async create(
    input: SaveCompanyInput,
    columns: CompanyColumns,
    logoId: string | null,
  ): Promise<SaveCompanyResult> {
    const [bank] = await this.db
      .select({ id: questionBanks.id })
      .from(questionBanks)
      .where(eq(questionBanks.status, "published"))
      .limit(1);
    if (bank === undefined) {
      throw new AppError(503, "survey_bank_unavailable", "Bộ câu hỏi chưa sẵn sàng.");
    }

    for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt += 1) {
      const code = generateReportCode();
      try {
        await this.db.transaction(async (tx) => {
          const [company] = await tx
            .insert(companies)
            .values({
              ...columns,
              userId: input.user?.userId ?? null,
              logoFileId: logoId,
            })
            .returning({ id: companies.id });
          if (company === undefined) {
            throw new Error("Không tạo được hồ sơ doanh nghiệp");
          }
          await tx.insert(reports).values({
            code,
            companyId: company.id,
            ownerUserId: input.user?.userId ?? null,
            bankVersionId: bank.id,
          });
          await this.files.markReferenced(tx, logoId === null ? [] : [logoId]);
          await this.recordConsents(tx, company.id, input.form);
        });
        return this.result(code, input.user?.userId ?? null);
      } catch (error) {
        if (!isUniqueViolation(error) || attempt === MAX_CODE_ATTEMPTS - 1) {
          throw error;
        }
      }
    }
    throw new Error("Không tạo được mã báo cáo");
  }

  private async recordConsents(
    tx: Parameters<Parameters<Database["transaction"]>[0]>[0],
    companyId: string,
    form: CompanyFormInput,
  ): Promise<void> {
    const wanted: ReadonlyArray<readonly [ConsentKind, boolean]> = [
      ["matching", form.profile.consentB2B === "yes"],
      ["research", form.profile.consentData === "yes"],
    ];
    for (const [kind, granted] of wanted) {
      const [latest] = await tx
        .select({ granted: consents.granted })
        .from(consents)
        .where(and(eq(consents.companyId, companyId), eq(consents.kind, kind)))
        .orderBy(desc(consents.createdAt), desc(consents.id))
        .limit(1);
      const changed = latest === undefined ? granted : latest.granted !== granted;
      if (changed) {
        await tx.insert(consents).values({
          companyId,
          kind,
          granted,
          textVersion: CONSENT_TEXT_VERSION,
          formVersion: CONSENT_FORM_VERSION,
        });
      }
    }
  }

  private result(code: string, ownerUserId: string | null): SaveCompanyResult {
    return {
      reportCode: code,
      claimToken: ownerUserId === null ? signToken(this.env.SESSION_SECRET, "claim", code) : null,
    };
  }
}
