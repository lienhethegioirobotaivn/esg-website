import type { Database } from "../database/client.js";
import { parseQuestionBank, readerRequests } from "./parse-question-bank.js";
import type { ImportIssue, ImportSummary, ParsedBank } from "./question-bank.types.js";
import { QuestionBankImporter } from "./question-bank-importer.js";
import {
  hasErrors,
  QuestionBankValidationError,
  validateQuestionBank,
} from "./validate-question-bank.js";
import { readWorkbookTables } from "./xlsx-tables.js";

export interface ImportRequest {
  readonly source: string | Buffer;
  readonly version?: string;
  readonly publish?: boolean;
  readonly note?: string;
}

export interface ImportOutcome {
  readonly version: string | null;
  readonly issues: readonly ImportIssue[];
  readonly bank: ParsedBank;
  readonly summary: ImportSummary;
}

export async function checkQuestionBank(
  source: string | Buffer,
  version?: string,
): Promise<{ bank: ParsedBank; issues: ImportIssue[] }> {
  const workbook = await readWorkbookTables(source, readerRequests());
  const bank = parseQuestionBank(workbook, version === undefined ? {} : { version });
  return { bank, issues: validateQuestionBank(bank) };
}

export async function importQuestionBank(
  db: Database,
  request: ImportRequest,
): Promise<ImportOutcome> {
  const { bank, issues } = await checkQuestionBank(request.source, request.version);
  if (hasErrors(issues) || bank.version === null) {
    throw new QuestionBankValidationError(issues);
  }
  const summary = await new QuestionBankImporter(db).importBank(bank, {
    version: bank.version,
    publish: request.publish === true,
    ...(request.note === undefined ? {} : { note: request.note }),
  });
  return { version: bank.version, issues, bank, summary };
}
