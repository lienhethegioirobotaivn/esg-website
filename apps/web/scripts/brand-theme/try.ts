import { createRequire } from "node:module";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

import { BRAND_IMAGE_LIMITS, mergePalettes, paletteFromPixels } from "@esg/shared";
import type { PaletteColor } from "@esg/shared";

import { analyzeBrand } from "../../src/server/brand-theme/analyze-brand";
import { createRateWindow } from "../../src/server/brand-theme/limits";

interface SharpInstance {
  resize(width: number, height: number, options: { fit: string }): SharpInstance;
  ensureAlpha(): SharpInstance;
  raw(): SharpInstance;
  toBuffer(): Promise<Buffer>;
}
type SharpFactory = (input: Buffer) => SharpInstance;

const EXTENSIONS: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};

function loadSharp(): SharpFactory | null {
  try {
    const requireFromNext = createRequire(require.resolve("next/package.json"));
    return requireFromNext("sharp") as SharpFactory;
  } catch {
    return null;
  }
}

async function paletteOf(sharp: SharpFactory | null, bytes: Buffer): Promise<PaletteColor[]> {
  if (sharp === null) {
    return [];
  }
  const side = 96;
  const raw = await sharp(bytes).resize(side, side, { fit: "inside" }).ensureAlpha().raw().toBuffer();
  return paletteFromPixels(raw);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const noAi = args.includes("--no-ai");
  const folder = args.find((arg) => !arg.startsWith("--"));
  if (folder === undefined) {
    console.error("Cách dùng: pnpm brand:try <thư mục chứa ảnh> [--no-ai]");
    process.exit(1);
  }

  const names = (await readdir(folder))
    .filter((name) => path.extname(name).toLowerCase() in EXTENSIONS)
    .sort()
    .slice(0, BRAND_IMAGE_LIMITS.maxImages);
  if (names.length === 0) {
    console.error("Không thấy ảnh PNG/JPG/WEBP trong thư mục.");
    process.exit(1);
  }

  const sharp = loadSharp();
  if (sharp === null) {
    console.warn("Không nạp được sharp nên không đo được bảng màu, AI vẫn xem ảnh bình thường.");
  }

  const images = [];
  const palettes: PaletteColor[][] = [];
  for (const name of names) {
    const bytes = await readFile(path.join(folder, name));
    const mimeType = EXTENSIONS[path.extname(name).toLowerCase()] ?? "image/png";
    images.push({ mimeType, bytes: new Uint8Array(bytes) });
    palettes.push(await paletteOf(sharp, bytes));
  }
  const palette = mergePalettes(palettes);

  const result = await analyzeBrand({
    images,
    palette,
    consent: !noAi,
    apiKey: process.env.GEMINI_API_KEY,
    model: process.env.GEMINI_BRAND_MODEL || process.env.GEMINI_MODEL || "gemini-3.8-flash",
    baseUrl: process.env.GEMINI_API_BASE_URL,
    rate: { window: createRateWindow(), key: "cli", ipLimit: 100, dailyLimit: 100 },
  });

  console.log(`Ảnh: ${names.join(", ")}`);
  console.log(`Bảng màu đo được: ${palette.map((color) => `${color.hex} ${Math.round(color.share * 100)}%`).join(", ") || "(trống)"}`);
  console.log(`Nguồn: ${result.source} | Lý do dự phòng: ${result.reason}`);
  console.log(JSON.stringify(result.theme, null, 2));
  console.log("\nDán vào Console của trình duyệt (trang web đang chạy) để xem thử:");
  console.log(`localStorage.setItem("esg-brand-theme-v1", ${JSON.stringify(JSON.stringify(result.theme))})`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
