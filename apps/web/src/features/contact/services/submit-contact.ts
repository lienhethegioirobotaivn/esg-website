import type { InquiryKind } from "@esg/shared";

import type { InquiryFormValues } from "../constants";

export class SubmitContactError extends Error {
  readonly fields: Record<string, string>;

  constructor(message: string, fields: Record<string, string> = {}) {
    super(message);
    this.name = "SubmitContactError";
    this.fields = fields;
  }
}

const GENERIC_ERROR = "Không gửi được yêu cầu. Vui lòng thử lại sau.";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readFields(source: unknown): Record<string, string> {
  const fields: Record<string, string> = {};
  if (!isRecord(source)) {
    return fields;
  }
  for (const [key, message] of Object.entries(source)) {
    if (typeof message === "string") {
      fields[key] = message;
    }
  }
  return fields;
}

async function post(body: Record<string, unknown>): Promise<void> {
  let response: Response;
  try {
    response = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new SubmitContactError(GENERIC_ERROR);
  }
  if (response.ok) {
    return;
  }
  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }
  const error = isRecord(payload) ? payload["error"] : null;
  throw new SubmitContactError(
    isRecord(error) && typeof error["message"] === "string"
      ? error["message"]
      : GENERIC_ERROR,
    isRecord(error) ? readFields(error["fields"]) : {},
  );
}

export function submitInquiry(
  kind: InquiryKind,
  values: InquiryFormValues,
): Promise<void> {
  return post({ type: "inquiry", kind, ...values });
}

export function submitFeedback(values: {
  comment: string;
  email: string;
}): Promise<void> {
  return post({ type: "feedback", ...values });
}
