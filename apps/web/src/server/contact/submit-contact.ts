import "server-only";

import { feedbackSchema, flattenIssues, inquirySchema } from "@esg/shared";
import type { Feedback, Inquiry } from "@esg/shared";

import { headcountOptions, industryOptions } from "@/data";
import { msg } from "@/features/locale/lib/translate";

import { CompanyBridgeError, callBridge } from "../company/save-company";
import { getServerEnv } from "../env";

const KIND_LABELS: Record<Inquiry["kind"], string> = {
  advisory: "Tư vấn",
  assessment: "Kiểm định",
};

export class ContactInputError extends Error {
  readonly fields: Record<string, string>;

  constructor(message: string, fields: Record<string, string>) {
    super(message);
    this.name = "ContactInputError";
    this.fields = fields;
  }
}

function findLabel(
  options: readonly { value: string; label: string }[],
  value: string,
): string {
  return options.find((option) => option.value === value)?.label ?? value;
}

function getBridgeConfig(): { url: string; secret: string } {
  const env = getServerEnv();
  if (!env.GOOGLE_APPS_SCRIPT_URL || !env.GOOGLE_APPS_SCRIPT_SECRET) {
    throw new CompanyBridgeError(
      "Chưa cấu hình GOOGLE_APPS_SCRIPT_URL hoặc GOOGLE_APPS_SCRIPT_SECRET.",
      "not-configured",
    );
  }
  return {
    url: env.GOOGLE_APPS_SCRIPT_URL,
    secret: env.GOOGLE_APPS_SCRIPT_SECRET,
  };
}

export async function submitInquiry(input: unknown): Promise<void> {
  const parsed = inquirySchema.safeParse(input);
  if (!parsed.success) {
    throw new ContactInputError(
      msg("Dữ liệu chưa hợp lệ. Vui lòng kiểm tra lại các mục được đánh dấu."),
      flattenIssues(parsed.error),
    );
  }
  const data = parsed.data;
  const bridge = getBridgeConfig();

  await callBridge(bridge.url, {
    secret: bridge.secret,
    action: "saveInquiry",
    fields: {
      "Loại yêu cầu": KIND_LABELS[data.kind],
      "Tên doanh nghiệp": data.name,
      "Thông tin / nhu cầu": data.description,
      "Quy mô nhân sự": findLabel(headcountOptions, data.headcount),
      "Ngành nghề": findLabel(industryOptions, data.industry),
      "Số điện thoại": data.phone,
      Email: data.email,
    },
  });
}

export async function submitFeedback(input: unknown): Promise<void> {
  const parsed = feedbackSchema.safeParse(input);
  if (!parsed.success) {
    throw new ContactInputError(
      msg("Dữ liệu chưa hợp lệ."),
      flattenIssues(parsed.error),
    );
  }
  const data: Feedback = parsed.data;
  const bridge = getBridgeConfig();

  await callBridge(bridge.url, {
    secret: bridge.secret,
    action: "saveFeedback",
    fields: {
      "Ý kiến": data.comment,
      Email: data.email,
    },
  });
}
