import { brandThemeResultSchema } from "@esg/shared";
import type { BrandThemeResult } from "@esg/shared";

import { msg } from "@/features/locale/lib/translate";

import type { PreparedBrandImages } from "./prepare-images";

export class BrandAnalysisError extends Error {}

export async function requestBrandAnalysis(
  prepared: PreparedBrandImages,
  useAi: boolean,
  signal?: AbortSignal,
): Promise<BrandThemeResult> {
  const form = new FormData();
  for (const image of prepared.images) {
    form.append("images", image.blob, image.name);
  }
  form.append("palette", JSON.stringify(prepared.palette));
  form.append("useAi", useAi ? "true" : "false");

  let response: Response;
  try {
    response = await fetch("/api/brand-theme/analyze", { method: "POST", body: form, signal });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw error;
    }
    throw new BrandAnalysisError(msg("Không kết nối được tới máy chủ. Vui lòng thử lại."));
  }

  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      typeof payload === "object" && payload !== null && "error" in payload
        ? (payload as { error?: { message?: unknown } }).error?.message
        : undefined;
    throw new BrandAnalysisError(
      typeof message === "string" ? message : msg("Không phân tích được bộ nhận diện thương hiệu."),
    );
  }
  const parsed = brandThemeResultSchema.safeParse(payload);
  if (!parsed.success) {
    throw new BrandAnalysisError(msg("Không phân tích được bộ nhận diện thương hiệu."));
  }
  return parsed.data;
}
