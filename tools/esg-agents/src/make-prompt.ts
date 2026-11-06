import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { parseArgs } from "node:util";

import { HEADCOUNT_TIERS, INDUSTRY_SOURCES, selectSurvey } from "@esg/shared";

import { loadSurveyBank } from "./bank";
import { companyDir, slugify } from "./paths";
import { companyPrompt, groupQuestions, pillarPrompt } from "./prompts";

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      name: { type: "string" },
      industry: { type: "string" },
      headcount: { type: "string" },
      year: { type: "string", default: "2024" },
      source: { type: "string", default: "Tìm trên web (đã bật Grounding with Google Search)" },
    },
  });

  const name = values.name;
  const industry = values.industry;
  const headcount = values.headcount;
  if (name === undefined || industry === undefined || headcount === undefined) {
    throw new Error(
      `Thiếu tham số. Ví dụ: --name "VinUni" --industry education --headcount 200-499 [--year 2024] [--source "tệp PDF đính kèm"]`,
    );
  }
  if (!(industry in INDUSTRY_SOURCES)) {
    throw new Error(`industry không hợp lệ. Dùng: ${Object.keys(INDUSTRY_SOURCES).join(", ")}`);
  }
  if (!(headcount in HEADCOUNT_TIERS)) {
    throw new Error(`headcount không hợp lệ. Dùng: ${Object.keys(HEADCOUNT_TIERS).join(", ")}`);
  }
  const year = values.year ?? "2024";
  const source = values.source ?? "";

  const survey = selectSurvey(await loadSurveyBank(), { industry, headcount });
  const slug = slugify(name);
  const dir = companyDir(slug);
  await mkdir(dir, { recursive: true });

  await writeFile(
    join(dir, "meta.json"),
    `${JSON.stringify({ name, industry, headcount, year }, null, 2)}\n`,
    "utf8",
  );
  await writeFile(
    join(dir, "prompt-0-ho-so.md"),
    `${companyPrompt({ name, year, source })}\n`,
    "utf8",
  );

  let total = 0;
  for (const [index, pillar] of survey.entries()) {
    const groups = groupQuestions(survey, pillar.id);
    const count = groups.reduce((sum, group) => sum + group.items.length, 0);
    total += count;
    await writeFile(
      join(dir, `prompt-${index + 1}-${pillar.id}.md`),
      `${pillarPrompt({ name, year, source }, pillar.name, groups)}\n`,
      "utf8",
    );
    console.log(`${pillar.id} (${pillar.name}): ${count} câu`);
  }
  console.log(`Tổng ${total} câu. Thư mục: ${dir}`);
  console.log("Mở từng file prompt-*.md và dán vào Google AI Studio.");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
