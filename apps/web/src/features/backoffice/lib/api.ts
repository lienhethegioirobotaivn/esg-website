import { downloadBlob } from "@/lib/download-blob";

export const API_PREFIX = "/api/v1";
export const SESSION_EXPIRED_EVENT = "esg-admin-session-expired";
export const SESSION_RESTORED_EVENT = "esg-admin-session-restored";

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fields: Record<string, string>;

  constructor(
    message: string,
    status: number,
    code = "",
    fields: Record<string, string> = {},
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

export type QueryValue = string | number | boolean | null | undefined;

export function withQuery(
  path: string,
  params: Record<string, QueryValue>,
): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      search.set(key, String(value));
    }
  }
  const text = search.toString();
  return text === "" ? path : `${path}?${text}`;
}

export function errorMessage(caught: unknown, fallback: string): string {
  return caught instanceof ApiError ? caught.message : fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function fallbackMessage(status: number): string {
  if (status === 401) {
    return "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
  }
  if (status === 413) {
    return "Tệp hoặc nội dung gửi lên quá lớn.";
  }
  if (status === 429) {
    return "Bạn thao tác quá nhanh. Vui lòng đợi một lát rồi thử lại.";
  }
  if (status >= 500) {
    return "Máy chủ đang gặp lỗi hoặc chưa chạy. Vui lòng thử lại sau.";
  }
  return "Có lỗi xảy ra. Vui lòng thử lại.";
}

async function toError(response: Response): Promise<ApiError> {
  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }
  const error =
    isRecord(payload) && isRecord(payload["error"]) ? payload["error"] : {};
  const fields: Record<string, string> = {};
  if (isRecord(error["fields"])) {
    for (const [key, value] of Object.entries(error["fields"])) {
      if (typeof value === "string") {
        fields[key] = value;
      }
    }
  }
  return new ApiError(
    typeof error["message"] === "string"
      ? error["message"]
      : fallbackMessage(response.status),
    response.status,
    typeof error["code"] === "string" ? error["code"] : "",
    fields,
  );
}

async function send(path: string, init: RequestInit): Promise<Response> {
  let response: Response;
  try {
    response = await fetch(`${API_PREFIX}${path}`, {
      credentials: "same-origin",
      cache: "no-store",
      ...init,
    });
  } catch (caught) {
    if (init.signal?.aborted) {
      throw caught;
    }
    throw new ApiError("Không kết nối được tới máy chủ.", 0);
  }
  if (!response.ok) {
    if (response.status === 401 && path !== "/admin/login") {
      window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
    }
    throw await toError(response);
  }
  return response;
}

async function readBody<T>(response: Response): Promise<T> {
  if (response.status === 204) {
    return undefined as T;
  }
  const text = await response.text();
  return (text === "" ? undefined : JSON.parse(text)) as T;
}

export async function getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  return readBody<T>(await send(path, { method: "GET", signal }));
}

export async function sendJson<T>(
  method: "POST" | "PUT" | "PATCH" | "DELETE",
  path: string,
  body?: unknown,
): Promise<T> {
  return readBody<T>(
    await send(path, {
      method,
      ...(body === undefined
        ? {}
        : {
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          }),
    }),
  );
}

export async function sendForm<T>(path: string, form: FormData): Promise<T> {
  return readBody<T>(await send(path, { method: "POST", body: form }));
}

export async function downloadFile(
  path: string,
  fallbackName: string,
): Promise<void> {
  const response = await send(path, { method: "GET" });
  const disposition = response.headers.get("content-disposition") ?? "";
  const name = /filename="([^"]+)"/.exec(disposition)?.[1] ?? fallbackName;
  downloadBlob(await response.blob(), name);
}
