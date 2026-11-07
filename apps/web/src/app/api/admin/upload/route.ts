import { NextResponse } from "next/server";

import { callAbout } from "@/server/about/bridge";
import { bridgeErrorResponse, jsonError } from "@/server/admin/api-helpers";
import { requireAdminApi } from "@/server/admin/session";
import { detectImageType } from "@/server/company/detect-image-type";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 3 * 1024 * 1024;

export async function POST(request: Request) {
  const denied = await requireAdminApi();
  if (denied) {
    return denied;
  }
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return jsonError(400, "Dữ liệu tải lên không hợp lệ.");
  }
  const file = form.get("image");
  if (!(file instanceof File) || file.size === 0) {
    return jsonError(400, "Vui lòng chọn một ảnh.");
  }
  if (file.size > MAX_BYTES) {
    return jsonError(400, "Ảnh không được lớn hơn 3 MB.");
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = detectImageType(bytes);
  if (type === null) {
    return jsonError(400, "Ảnh phải là JPG, PNG hoặc WEBP.");
  }
  try {
    const response = await callAbout("uploadImage", {
      image: { mimeType: type, base64: Buffer.from(bytes).toString("base64") },
    });
    const url = response["url"];
    if (typeof url !== "string") {
      return jsonError(502, "Apps Script không trả về đường dẫn ảnh.");
    }
    return NextResponse.json({ ok: true, url });
  } catch (error) {
    return bridgeErrorResponse(error);
  }
}
