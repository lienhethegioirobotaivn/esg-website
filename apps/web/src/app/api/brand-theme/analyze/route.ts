import { BRAND_IMAGE_LIMITS, brandPaletteSchema } from "@esg/shared";
import { NextResponse } from "next/server";

import { msg } from "@/features/locale/lib/translate";
import { analyzeBrand } from "@/server/brand-theme/analyze-brand";
import { clientKey, sharedRateWindow } from "@/server/brand-theme/limits";
import { detectImageType } from "@/server/company/detect-image-type";
import { getServerEnv } from "@/server/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_BODY_BYTES = BRAND_IMAGE_LIMITS.maxTotalPreparedBytes + 200_000;

function fail(status: number, message: string) {
  return NextResponse.json({ error: { message } }, { status });
}

function parsePalette(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || value.length > 4000) {
    return null;
  }
  try {
    const parsed = brandPaletteSchema.safeParse(JSON.parse(value));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const env = getServerEnv();
  if (!env.ENABLE_BRAND_THEME) {
    return fail(404, msg("Không tìm thấy."));
  }

  const declared = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) {
    return fail(413, msg("Ảnh quá lớn. Hãy chọn ít ảnh hơn hoặc ảnh nhẹ hơn."));
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return fail(400, msg("Dữ liệu gửi lên không hợp lệ."));
  }

  const palette = parsePalette(form.get("palette"));
  if (palette === null) {
    return fail(400, msg("Dữ liệu gửi lên không hợp lệ."));
  }

  const files = form.getAll("images").filter((entry): entry is File => entry instanceof File);
  if (files.length > BRAND_IMAGE_LIMITS.maxImages) {
    return fail(400, msg("Số ảnh vượt quá giới hạn cho phép."));
  }

  const images = [];
  let total = 0;
  for (const file of files) {
    if (file.size === 0 || file.size > BRAND_IMAGE_LIMITS.maxPreparedBytes) {
      return fail(400, msg("Ảnh quá lớn. Hãy chọn ít ảnh hơn hoặc ảnh nhẹ hơn."));
    }
    total += file.size;
    if (total > BRAND_IMAGE_LIMITS.maxTotalPreparedBytes) {
      return fail(413, msg("Ảnh quá lớn. Hãy chọn ít ảnh hơn hoặc ảnh nhẹ hơn."));
    }
    const bytes = new Uint8Array(await file.arrayBuffer());
    const mimeType = detectImageType(bytes);
    if (mimeType === null) {
      return fail(400, msg("Chỉ nhận ảnh PNG, JPG hoặc WEBP."));
    }
    images.push({ mimeType, bytes });
  }

  const result = await analyzeBrand({
    images,
    palette,
    consent: form.get("useAi") === "true",
    apiKey: env.GEMINI_API_KEY,
    model: env.GEMINI_BRAND_MODEL ?? env.GEMINI_MODEL,
    baseUrl: env.GEMINI_API_BASE_URL,
    rate: {
      window: sharedRateWindow(),
      key: clientKey(request),
      ipLimit: env.BRAND_AI_IP_LIMIT,
      dailyLimit: env.BRAND_AI_DAILY_LIMIT,
    },
  });
  return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
}
