import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { z } from "zod";

import { loadConfig } from "./config";
import { GeminiError, extractJson, generateGrounded } from "./gemini";
import { SECTORS, SECTOR_CODES, isSectorCode } from "./sectors";
import type { SectorCode } from "./sectors";

const OUTPUT_FILE = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "output",
  "candidates.json",
);

const optionalText = z
  .string()
  .nullish()
  .transform((value) => value ?? "");

const candidateSchema = z.object({
  name: z.string().min(1),
  website: optionalText,
  evidenceUrl: optionalText,
  headcount: optionalText,
  reason: optionalText,
});

const storedSchema = z.object({
  id: z.string(),
  name: z.string(),
  sector: z.string(),
  website: z.string(),
  evidenceUrl: z.string(),
  headcount: z.string(),
  reason: z.string(),
  sources: z.array(z.object({ url: z.string(), title: z.string() })),
  queries: z.array(z.string()),
  foundAt: z.string(),
  status: z.enum(["pending", "approved", "rejected"]),
});

type StoredCandidate = z.infer<typeof storedSchema>;

function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function buildPrompt(sector: SectorCode, count: number): string {
  return [
    `Hãy tìm trên web tối đa ${count} doanh nghiệp vừa và nhỏ của Việt Nam thuộc nhóm ngành: ${SECTORS[sector]}.`,
    "Điều kiện:",
    "- Quy mô khoảng 20 đến 500 lao động, không phải tập đoàn hay công ty niêm yết lớn.",
    "- Có thông tin ESG hoặc phát triển bền vững công khai: báo cáo, trang web riêng, hoặc phần trong báo cáo thường niên (môi trường, lao động, quản trị).",
    "- Chỉ nêu doanh nghiệp bạn thực sự thấy trong kết quả tìm kiếm. Không bịa tên. Nếu chỉ tìm được ít hơn thì trả ít hơn, thậm chí mảng rỗng.",
    "Chỉ trả về một mảng JSON, không thêm chữ nào khác. Mỗi phần tử có các khóa:",
    '"name" (tên pháp lý hoặc tên thương mại), "website" (trang chủ chính thức), "evidenceUrl" (đường dẫn trực tiếp tới trang hoặc file có thông tin ESG), "headcount" (số lao động nếu thấy, ghi nguyên văn, không thấy thì để chuỗi rỗng), "reason" (một câu: vì sao doanh nghiệp này có dữ liệu ESG công khai).',
  ].join("\n");
}

async function readStored(): Promise<StoredCandidate[]> {
  try {
    const raw: unknown = JSON.parse(await readFile(OUTPUT_FILE, "utf8"));
    return z.array(storedSchema).parse(raw);
  } catch {
    return [];
  }
}

async function writeStored(items: readonly StoredCandidate[]): Promise<void> {
  await mkdir(dirname(OUTPUT_FILE), { recursive: true });
  await writeFile(OUTPUT_FILE, `${JSON.stringify(items, null, 2)}\n`, "utf8");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      sector: { type: "string", multiple: true },
      count: { type: "string", default: "3" },
    },
  });

  const requested = values.sector ?? [];
  const sectors: SectorCode[] =
    requested.length === 0
      ? SECTOR_CODES
      : requested.map((code) => {
          const upper = code.toUpperCase();
          if (!isSectorCode(upper)) {
            throw new Error(
              `Mã ngành không hợp lệ: ${code}. Dùng một trong: ${SECTOR_CODES.join(", ")}`,
            );
          }
          return upper;
        });
  const count = Math.max(1, Number.parseInt(values.count ?? "3", 10) || 3);

  const config = loadConfig();
  const stored = await readStored();
  const knownIds = new Set(stored.map((item) => item.id));

  for (const [index, sector] of sectors.entries()) {
    if (index > 0) {
      await sleep(config.REQUEST_DELAY_MS);
    }
    console.log(`[${sector}] đang tìm...`);
    try {
      const answer = await generateGrounded({
        apiKey: config.GEMINI_API_KEY,
        model: config.DISCOVER_MODEL,
        prompt: buildPrompt(sector, count),
      });
      const parsed = z.array(candidateSchema).parse(extractJson(answer.text));
      let added = 0;
      for (const candidate of parsed) {
        const id = `${sector}-${slugify(candidate.name)}`;
        if (knownIds.has(id)) {
          continue;
        }
        knownIds.add(id);
        stored.push({
          id,
          sector,
          ...candidate,
          sources: [...answer.sources],
          queries: [...answer.queries],
          foundAt: new Date().toISOString(),
          status: "pending",
        });
        added += 1;
      }
      await writeStored(stored);
      console.log(`[${sector}] thêm ${added} doanh nghiệp.`);
    } catch (error) {
      if (error instanceof GeminiError && error.status === 429) {
        console.error(
          `[${sector}] hết hạn mức (429). Đã lưu kết quả đến lúc này, chạy lại sau hoặc đổi DISCOVER_MODEL.`,
        );
        console.error(`Model: ${config.DISCOVER_MODEL}`);
        console.error(error.message);
        break;
      }
      console.error(
        `[${sector}] lỗi: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  console.log(`Xong. File: ${OUTPUT_FILE}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
