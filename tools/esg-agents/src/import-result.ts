import { parseArgs } from "node:util";

import { importResults } from "./import-core";

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      name: { type: "string" },
      "no-verify": { type: "boolean", default: false },
    },
  });
  if (values.name === undefined) {
    throw new Error(`Thiếu --name. Ví dụ: --name "VinUni"`);
  }
  const summary = await importResults(values.name, {
    verify: values["no-verify"] !== true,
  });
  console.log(
    `Hồ sơ: ${summary.companyCount} trường · Câu trả lời: ${summary.answerCount}/${summary.totalQuestions} · Bị loại: ${summary.rejected.length}`,
  );
  console.log(`Đã tạo trong ${summary.dir}: draft.json, load-draft.js, review.md, ai-filled.json`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
