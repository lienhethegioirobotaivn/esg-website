import { parseArgs } from "node:util";

import { EnvValidationError, loadEnv } from "../config/env.schema.js";
import { loadEnvFile } from "../config/load-env-file.js";
import { createDatabase, createPool } from "../database/client.js";
import { checkQuestionBank, importQuestionBank } from "./import-question-bank.js";
import { QuestionBankLockedError } from "./question-bank-importer.js";
import type { ImportIssue } from "./question-bank.types.js";
import { hasErrors, QuestionBankValidationError } from "./validate-question-bank.js";

const USAGE = `Cách dùng:
  pnpm --filter api question-bank:import -- --file <đường-dẫn.xlsx> [--version 0.1] [--publish] [--dry-run] [--note "ghi chú"]

  --file      File xlsx bộ câu hỏi (bắt buộc)
  --version   Số phiên bản; bỏ trống thì lấy từ cột content_version của file
  --publish   Xuất bản ngay sau khi nhập (phiên bản đang xuất bản trước đó chuyển sang lưu trữ)
  --dry-run   Chỉ kiểm tra file, không ghi database
  --note      Ghi chú lưu cùng phiên bản`;

function printIssues(issues: readonly ImportIssue[]): void {
  for (const issue of issues) {
    const label = issue.severity === "error" ? "LỖI" : "CẢNH BÁO";
    const place = [issue.tab, issue.row === null ? null : `dòng ${issue.row}`, issue.code]
      .filter((part): part is string => part !== null && part !== "")
      .join(" · ");
    console.error(`[${label}] ${place}: ${issue.message}`);
  }
}

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      file: { type: "string" },
      version: { type: "string" },
      publish: { type: "boolean", default: false },
      "dry-run": { type: "boolean", default: false },
      note: { type: "string" },
      help: { type: "boolean", default: false },
    },
    allowPositionals: false,
  });

  if (values.help === true || values.file === undefined) {
    console.log(USAGE);
    process.exit(values.help === true ? 0 : 1);
  }

  if (values["dry-run"] === true) {
    const { bank, issues } = await checkQuestionBank(
      values.file,
      values.version,
    );
    printIssues(issues);
    if (hasErrors(issues)) {
      throw new QuestionBankValidationError(issues);
    }
    console.log(
      `Kiểm tra xong: ${bank.questions.length} câu, ${bank.groups.length} nhóm, phiên bản ${bank.version ?? "?"}. Chưa ghi database.`,
    );
    return;
  }

  loadEnvFile();
  const env = loadEnv(process.env);
  const pool = createPool(env.DATABASE_URL, 2);
  try {
    const outcome = await importQuestionBank(createDatabase(pool), {
      source: values.file,
      publish: values.publish === true,
      ...(values.version === undefined ? {} : { version: values.version }),
      ...(values.note === undefined ? {} : { note: values.note }),
    });
    printIssues(outcome.issues);
    const summary = outcome.summary;
    console.log(
      `Đã nhập phiên bản ${summary.version} (${summary.status}): ${summary.questions} câu, ${summary.groups} nhóm, ${summary.approved} đã duyệt, ${summary.pending} chờ duyệt.`,
    );
    if (summary.replacedDraft) {
      console.log("Bản nháp cùng số phiên bản trước đó đã được thay thế.");
    }
    if (summary.archivedVersion !== null) {
      console.log(`Phiên bản ${summary.archivedVersion} đã chuyển sang lưu trữ.`);
    }
  } finally {
    await pool.end();
  }
}

main().catch((error: unknown) => {
  if (error instanceof QuestionBankValidationError) {
    printIssues(error.issues);
    console.error(error.message);
  } else if (error instanceof EnvValidationError || error instanceof QuestionBankLockedError) {
    console.error(error.message);
  } else {
    console.error("Nhập bộ câu hỏi thất bại:", error);
  }
  process.exit(1);
});
