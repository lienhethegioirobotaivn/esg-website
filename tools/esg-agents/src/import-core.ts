import { existsSync } from "node:fs";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import {
  DRAFT_VERSION,
  PROFILE_FIELDS,
  REPORT_PERIODS,
  draftSnapshotSchema,
  getAnswerChoices,
  getAnswerIssues,
  isValidNumber,
  profileSchema,
  selectSurvey,
} from "@esg/shared";
import type { DraftAnswer, Question } from "@esg/shared";
import { z } from "zod";

import {
  COMPANY_FIELD_LABELS,
  COMPANY_INITIAL_VALUES,
} from "../../../apps/web/src/features/company/constants";
import type { CompanyField } from "../../../apps/web/src/features/company/constants";
import { loadSurveyBank } from "./bank";
import { extractJson } from "./gemini";
import { companyDir, slugify } from "./paths";
import { locateQuote, parseSourceText, quoteContainsNumber } from "./verify";
import type { SourcePage } from "./verify";

const DRAFT_KEY = "esg-studio:draft";

const THIRD_PARTY_HOSTS = [
  "scribd.com",
  "studocu.com",
  "studocu.vn",
  "slideshare.net",
  "vertexaisearch.cloud.google.com",
];

const QUOTE_REQUIRED = new Set(["yes", "partial", "known", "provided"]);

const ISSUE_LABELS = {
  unanswered: "chưa trả lời",
  "missing-detail": "thiếu phần mô tả (note)",
  "invalid-number":
    "số liệu không hợp lệ (chỉ chữ số, dấu chấm hoặc phẩy thập phân, không có dấu phân cách hàng nghìn)",
} as const;

const AI_COMPANY_FIELDS = [
  "name",
  "taxCode",
  "address",
  "reportPeriod",
  "reportYear",
  "reportScope",
  ...PROFILE_FIELDS,
] as const;

const TEXT_ONLY_FIELDS: readonly string[] = [
  "name",
  "taxCode",
  "address",
  "reportPeriod",
  "reportYear",
  "reportScope",
];

const text = z
  .union([z.string(), z.number()])
  .nullish()
  .transform((value) => (value === null || value === undefined ? "" : String(value).trim()));

const sourceSchema = z.object({ quote: text, url: text, page: text });

const answerEntrySchema = z.object({
  id: text,
  value: text,
  number: text,
  note: text,
  quote: text,
  url: text,
  page: text,
});

const resultSchema = z.object({
  company: z.record(z.string(), text).optional(),
  evidence: z.record(z.string(), sourceSchema).optional(),
  answers: z.array(answerEntrySchema).optional(),
});

export const metaSchema = z.object({
  name: z.string(),
  industry: z.string(),
  headcount: z.string(),
  year: z.string(),
  sourceUrl: z.string().optional(),
});

type Checked = "ok" | "fail" | "none";

interface Row {
  readonly key: string;
  readonly label: string;
  readonly shown: string;
  readonly quote: string;
  readonly url: string;
  readonly page: string;
  readonly checked: Checked;
}

export interface ImportSummary {
  readonly dir: string;
  readonly companyCount: number;
  readonly answerCount: number;
  readonly totalQuestions: number;
  readonly rejected: readonly string[];
  readonly verifiedCount: number;
  readonly verifyOn: boolean;
}

function escapeCell(value: string): string {
  return value.replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}

function sourceFlag(url: string): string {
  if (url === "") {
    return "thiếu link nguồn";
  }
  try {
    const host = new URL(url).hostname.toLowerCase();
    return THIRD_PARTY_HOSTS.some((third) => host === third || host.endsWith(`.${third}`))
      ? "nguồn bên thứ ba"
      : "";
  } catch {
    return "link không hợp lệ";
  }
}

function flagsOf(row: Row): string {
  const flags: string[] = [];
  if (row.checked === "ok") {
    flags.push("✔ đã đối chiếu PDF");
  }
  if (row.checked === "fail") {
    flags.push("trích dẫn không có trong PDF");
  }
  if (!(row.checked === "ok" && row.url === "")) {
    const flag = sourceFlag(row.url);
    if (flag !== "") {
      flags.push(flag);
    }
  }
  return flags.join("; ");
}

function tableRow(row: Row): string {
  return `| 🟡 ${escapeCell(row.key)} | ${escapeCell(row.label)} | ${escapeCell(row.shown)} | ${escapeCell(row.quote)} | ${escapeCell(row.url)} | ${escapeCell(row.page)} | ${flagsOf(row)} |`;
}

const TABLE_HEAD =
  "| Mã | Nội dung | Giá trị AI điền | Trích nguyên văn | Link nguồn | Trang | Lưu ý |\n| --- | --- | --- | --- | --- | --- | --- |";

async function readResults(dir: string): Promise<z.infer<typeof resultSchema>[]> {
  const files = (await readdir(dir)).filter(
    (file) => file.startsWith("result-") && file.endsWith(".json"),
  );
  if (files.length === 0) {
    throw new Error(`Không có file result-*.json trong ${dir}`);
  }
  const results: z.infer<typeof resultSchema>[] = [];
  for (const file of files.sort()) {
    const raw = await readFile(join(dir, file), "utf8");
    try {
      results.push(resultSchema.parse(extractJson(raw)));
    } catch (error) {
      throw new Error(
        `File ${file} không đọc được: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
  return results;
}

async function readPages(dir: string, verify: boolean): Promise<SourcePage[] | null> {
  const file = join(dir, "source.txt");
  if (!verify || !existsSync(file)) {
    return null;
  }
  const pages = parseSourceText(await readFile(file, "utf8"));
  return pages.length === 0 ? null : pages;
}

export async function importResults(
  displayName: string,
  options: { readonly verify: boolean },
): Promise<ImportSummary> {
  const dir = companyDir(slugify(displayName));
  const meta = metaSchema.parse(
    JSON.parse(await readFile(join(dir, "meta.json"), "utf8")),
  );
  const results = await readResults(dir);
  const pages = await readPages(dir, options.verify);
  const defaultUrl = meta.sourceUrl ?? "";

  const survey = selectSurvey(await loadSurveyBank(), {
    industry: meta.industry,
    headcount: meta.headcount,
  });
  const questions = new Map<string, Question>();
  for (const pillar of survey) {
    for (const group of pillar.groups) {
      for (const question of group.questions) {
        questions.set(question.id, question);
      }
    }
  }

  const company: Record<string, string> = { ...COMPANY_INITIAL_VALUES };
  company["name"] = meta.name;
  company["industry"] = meta.industry;
  company["headcount"] = meta.headcount;
  company["reportYear"] = meta.year;

  const companyRows: Row[] = [];
  const rejected: string[] = [];
  const answers: Record<string, DraftAnswer> = {};
  const answerRows: Row[] = [];

  for (const result of results) {
    for (const field of AI_COMPANY_FIELDS) {
      const value = result.company?.[field];
      if (value === undefined || value === "") {
        continue;
      }
      if (field === "reportPeriod" && !REPORT_PERIODS.some((period) => period === value)) {
        rejected.push(`Hồ sơ ${field}: giá trị "${value}" không hợp lệ`);
        continue;
      }
      if (field === "reportYear" && !/^\d{4}$/.test(value)) {
        rejected.push(`Hồ sơ ${field}: "${value}" không phải năm`);
        continue;
      }
      if (!TEXT_ONLY_FIELDS.includes(field)) {
        const check = profileSchema.shape[field as keyof typeof profileSchema.shape].safeParse(value);
        if (!check.success) {
          rejected.push(`Hồ sơ ${field}: "${value}" không hợp lệ`);
          continue;
        }
      }
      company[field] = value;
      const evidence = result.evidence?.[field];
      const foundPage =
        pages !== null && evidence !== undefined && evidence.quote !== ""
          ? locateQuote(pages, evidence.quote)
          : null;
      const checked: Checked =
        pages === null || evidence === undefined || evidence.quote === ""
          ? "none"
          : foundPage === null
            ? "fail"
            : "ok";
      companyRows.push({
        key: field,
        label: COMPANY_FIELD_LABELS[field satisfies CompanyField],
        shown: value,
        quote: evidence?.quote ?? "",
        url: evidence?.url !== undefined && evidence.url !== "" ? evidence.url : defaultUrl,
        page: foundPage !== null ? String(foundPage) : (evidence?.page ?? ""),
        checked,
      });
    }

    for (const entry of result.answers ?? []) {
      const question = questions.get(entry.id);
      if (question === undefined) {
        rejected.push(`${entry.id}: mã câu không có trong bộ câu hỏi của ngành/quy mô này`);
        continue;
      }
      const choices = getAnswerChoices(question.inputType).map((choice) => choice.value);
      if (!choices.includes(entry.value)) {
        rejected.push(`${entry.id}: value "${entry.value}" không hợp lệ (cho phép: ${choices.join(", ")})`);
        continue;
      }
      const issues = getAnswerIssues(question, {
        value: entry.value,
        number: entry.number,
        description: entry.note,
      });
      if (issues.length > 0) {
        rejected.push(`${entry.id}: ${issues.map((issue) => ISSUE_LABELS[issue]).join("; ")}`);
        continue;
      }
      const numeric = question.inputType === "NUMBER" || question.inputType === "INTEGER";
      const hasNumber =
        numeric && entry.value === "known" && isValidNumber(entry.number, question.inputType);
      const number = hasNumber ? entry.number : "";

      let page = entry.page;
      let checked: Checked = "none";
      if (pages !== null && QUOTE_REQUIRED.has(entry.value)) {
        const found = entry.quote === "" ? null : locateQuote(pages, entry.quote);
        if (found === null) {
          rejected.push(`${entry.id}: trích dẫn không có trong PDF (có thể AI tự sinh)`);
          continue;
        }
        if (hasNumber && !quoteContainsNumber(entry.quote, number)) {
          rejected.push(`${entry.id}: số liệu ${number} không nằm trong đoạn trích dẫn`);
          continue;
        }
        page = String(found);
        checked = "ok";
      }

      answers[entry.id] = { value: entry.value, number, description: entry.note };
      const unit = question.unit === "" || number === "" ? "" : ` ${question.unit}`;
      answerRows.push({
        key: entry.id,
        label: question.text,
        shown: `${entry.value}${number === "" ? "" : ` · ${number}${unit}`}${entry.note === "" ? "" : ` · ${entry.note}`}`,
        quote: entry.quote,
        url: entry.url !== "" ? entry.url : defaultUrl,
        page,
        checked,
      });
    }
  }

  const snapshot = draftSnapshotSchema.parse({
    version: DRAFT_VERSION,
    savedAt: new Date().toISOString(),
    company,
    answers,
    activeGroupId: null,
  });

  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, "draft.json"), `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
  await writeFile(
    join(dir, "load-draft.js"),
    `localStorage.setItem(${JSON.stringify(DRAFT_KEY)}, ${JSON.stringify(JSON.stringify(snapshot))});\nlocation.reload();\n`,
    "utf8",
  );
  await writeFile(
    join(dir, "ai-filled.json"),
    `${JSON.stringify(
      { company: companyRows.map((row) => row.key), answers: answerRows.map((row) => row.key) },
      null,
      2,
    )}\n`,
    "utf8",
  );

  const verifiedCount = answerRows.filter((row) => row.checked === "ok").length;
  const verifyLine =
    pages === null
      ? "Đối chiếu với PDF: chưa thực hiện (không có source.txt hoặc đã tắt)."
      : `Đối chiếu với PDF: ${verifiedCount}/${answerRows.length} câu có trích dẫn khớp tài liệu (trang đã được sửa theo PDF).`;
  const review = [
    `# Rà soát dữ liệu AI điền: ${meta.name}`,
    "",
    `Ngành: ${meta.industry} · Quy mô: ${meta.headcount} · Năm: ${meta.year}`,
    `Số câu trong bộ câu hỏi: ${questions.size} · AI điền: ${answerRows.length} · Chưa có: ${questions.size - answerRows.length} · Bị loại: ${rejected.length}`,
    verifyLine,
    "",
    "Mọi dòng có 🟡 là giá trị do AI điền. Cần đối chiếu với tài liệu gốc trước khi dùng làm số liệu chuẩn.",
    "",
    "## Hồ sơ doanh nghiệp",
    "",
    TABLE_HEAD,
    ...companyRows.map(tableRow),
    "",
    "## Câu trả lời",
    "",
    TABLE_HEAD,
    ...answerRows.map(tableRow),
    "",
    "## Bị loại (không đưa vào bản nháp)",
    "",
    ...(rejected.length === 0 ? ["Không có."] : rejected.map((item) => `- ${item}`)),
    "",
  ].join("\n");
  await writeFile(join(dir, "review.md"), review, "utf8");

  return {
    dir,
    companyCount: companyRows.length,
    answerCount: answerRows.length,
    totalQuestions: questions.size,
    rejected,
    verifiedCount,
    verifyOn: pages !== null,
  };
}
