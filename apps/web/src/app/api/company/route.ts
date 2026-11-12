import { NextResponse } from "next/server";
import { msg } from "@/features/locale/lib/translate";

import {
  CompanyBridgeError,
  CompanyInputError,
  saveCompany,
} from "@/server/company/save-company";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function errorResponse(
  status: number,
  message: string,
  fields: Record<string, string> = {},
) {
  return NextResponse.json({ error: { message, fields } }, { status });
}

export async function POST(request: Request) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return errorResponse(400, msg("Dữ liệu gửi lên không hợp lệ."));
  }

  try {
    const result = await saveCompany(form);
    return NextResponse.json({ reportCode: result.reportCode });
  } catch (error) {
    if (error instanceof CompanyInputError) {
      return errorResponse(400, error.message, error.fields);
    }
    if (error instanceof CompanyBridgeError) {
      console.error(error.message);
      return error.kind === "not-configured"
        ? errorResponse(503, msg("Chưa cấu hình kết nối lưu dữ liệu vào Google Sheet."))
        : errorResponse(502, msg("Không lưu được vào Google Sheet. Vui lòng thử lại sau."));
    }
    console.error(error);
    return errorResponse(500, msg("Không lưu được thông tin doanh nghiệp."));
  }
}
