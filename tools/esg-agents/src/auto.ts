import { readdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { parseArgs } from "node:util";

import { HEADCOUNT_TIERS, INDUSTRY_SOURCES, selectSurvey } from "@esg/shared";

import { loadSurveyBank } from "./bank";
import { loadConfig } from "./config";
import { GeminiError, extractJson, generateJson } from "./gemini";
import { importResults } from "./import-core";
import { companyDir, slugify } from "./paths";
import { loadSource } from "./pdf";
import { companyPrompt, fullPrompt, groupQuestions, pillarPrompt } from "./prompts";

const RATE_WAIT_MS = 65_000;

interface Part {
  readonly tag: string;
  readonly prompt: string;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function askWithRetry(input: {
  readonly apiKey: string;
  readonly model: string;
  readonly prompt: string;
}): Promise<{ text: string; finishReason: string }> {
  try {
    return await generateJson(input);
  } catch (error) {
    if (error instanceof GeminiError && error.status === 429) {
      console.log("Chạm giới hạn tốc độ, chờ 65 giây rồi thử lại một lần...");
      await sleep(RATE_WAIT_MS);
      return generateJson(input);
    }
    throw error;
  }
}

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      name: { type: "string" },
      industry: { type: "string" },
      headcount: { type: "string" },
      year: { type: "string", default: "2024" },
      pdf: { type: "string" },
      pages: { type: "string" },
      split: { type: "boolean", default: false },
      "no-verify": { type: "boolean", default: false },
    },
  });

  const { name, industry, headcount, pdf } = values;
  if (name === undefined || industry === undefined || headcount === undefined || pdf === undefined) {
    throw new Error(
      `Thiếu tham số. Ví dụ: --name "VinUni" --industry education --headcount gte-500 --year 2024 --pdf "https://.../bao-cao.pdf"`,
    );
  }
  if (!(industry in INDUSTRY_SOURCES)) {
    throw new Error(`industry không hợp lệ. Dùng: ${Object.keys(INDUSTRY_SOURCES).join(", ")}`);
  }
  if (!(headcount in HEADCOUNT_TIERS)) {
    throw new Error(`headcount không hợp lệ. Dùng: ${Object.keys(HEADCOUNT_TIERS).join(", ")}`);
  }
  const year = values.year ?? "2024";
  const config = loadConfig();
  const dir = companyDir(slugify(name));

  console.log("1/4 Đọc bộ câu hỏi từ Google Sheet...");
  const survey = selectSurvey(await loadSurveyBank(), { industry, headcount });
  const questionCount = survey.reduce(
    (sum, pillar) => sum + pillar.groups.reduce((inner, group) => inner + group.questions.length, 0),
    0,
  );
  console.log(`    ${questionCount} câu cho ngành ${industry}, quy mô ${headcount}`);

  console.log("2/4 Tải và đọc PDF...");
  const source = await loadSource({ source: pdf, dir, pages: values.pages });
  console.log(
    `    ${source.pageCount} trang, khoảng ${source.estimatedTokens.toLocaleString("en-US")} token`,
  );

  for (const file of await readdir(dir)) {
    if (file.startsWith("result-")) {
      await rm(join(dir, file));
    }
  }
  await writeFile(
    join(dir, "meta.json"),
    `${JSON.stringify({ name, industry, headcount, year, sourceUrl: source.sourceUrl }, null, 2)}\n`,
    "utf8",
  );

  const header = {
    name,
    year,
    source: `tài liệu bên dưới${source.sourceUrl === "" ? "" : ` (${source.sourceUrl})`}`,
  };
  const parts: Part[] =
    values.split === true
      ? [
          { tag: "ho-so", prompt: companyPrompt(header) },
          ...survey.map((pillar) => ({
            tag: pillar.id,
            prompt: pillarPrompt(header, pillar.name, groupQuestions(survey, pillar.id)),
          })),
        ]
      : [{ tag: "all", prompt: fullPrompt(header, survey) }];

  console.log(`3/4 Gửi cho ${config.EXTRACT_MODEL} (${parts.length} lượt gọi)...`);
  for (const [index, part] of parts.entries()) {
    if (index > 0) {
      console.log("    Chờ 65 giây để không vượt giới hạn token mỗi phút...");
      await sleep(RATE_WAIT_MS);
    }
    const prompt = `${part.prompt}\n\n=== TÀI LIỆU NGUỒN (mỗi trang bắt đầu bằng [Trang N]) ===\n${source.text}`;
    const answer = await askWithRetry({
      apiKey: config.GEMINI_API_KEY,
      model: config.EXTRACT_MODEL,
      prompt,
    });
    await writeFile(join(dir, `result-${part.tag}.json`), answer.text, "utf8");
    try {
      extractJson(answer.text);
    } catch {
      throw new Error(
        `Kết quả "${part.tag}" không phải JSON hợp lệ (finishReason: ${answer.finishReason}). Chạy lại với --split để chia nhỏ.`,
      );
    }
    if (answer.finishReason === "MAX_TOKENS") {
      console.log("    Cảnh báo: AI bị cắt giữa chừng vì quá dài. Nên chạy lại với --split.");
    }
    console.log(`    xong lượt ${index + 1}/${parts.length}`);
  }

  console.log("4/4 Kiểm tra và tạo bản nháp...");
  const summary = await importResults(name, { verify: values["no-verify"] !== true });
  console.log(
    `    Hồ sơ ${summary.companyCount} trường · Câu trả lời ${summary.answerCount}/${summary.totalQuestions} · Bị loại ${summary.rejected.length}`,
  );
  if (summary.verifyOn) {
    console.log(`    Đối chiếu PDF: ${summary.verifiedCount}/${summary.answerCount} câu khớp tài liệu`);
  }
  console.log("");
  console.log(`Xong. Thư mục: ${summary.dir}`);
  console.log("  review.md       bảng dữ liệu AI điền, mở ra kiểm tra");
  console.log("  load-draft.js   dán vào Console trình duyệt (F12) khi đang mở web để nạp dữ liệu");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
