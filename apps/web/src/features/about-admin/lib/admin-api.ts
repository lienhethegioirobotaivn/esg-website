export class AdminApiError extends Error {
  readonly status: number;
  readonly fields: Record<string, string>;

  constructor(message: string, status: number, fields: Record<string, string> = {}) {
    super(message);
    this.name = "AdminApiError";
    this.status = status;
    this.fields = fields;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

async function toError(response: Response): Promise<AdminApiError> {
  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }
  const error = isRecord(payload) ? payload["error"] : null;
  const message =
    isRecord(error) && typeof error["message"] === "string"
      ? error["message"]
      : "Có lỗi xảy ra. Vui lòng thử lại.";
  const fields: Record<string, string> = {};
  if (isRecord(error) && isRecord(error["fields"])) {
    for (const [key, value] of Object.entries(error["fields"])) {
      if (typeof value === "string") {
        fields[key] = value;
      }
    }
  }
  return new AdminApiError(message, response.status, fields);
}

async function request(
  url: string,
  init: RequestInit,
): Promise<Record<string, unknown>> {
  let response: Response;
  try {
    response = await fetch(url, init);
  } catch {
    throw new AdminApiError("Không kết nối được tới máy chủ.", 0);
  }
  if (!response.ok) {
    throw await toError(response);
  }
  const payload: unknown = await response.json();
  return isRecord(payload) ? payload : {};
}

function postJson(url: string, body: unknown): Promise<Record<string, unknown>> {
  return request(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function login(password: string): Promise<void> {
  await postJson("/api/admin/login", { password });
}

export async function logout(): Promise<void> {
  await postJson("/api/admin/logout", {});
}

export async function savePost(post: unknown): Promise<string> {
  const response = await postJson("/api/admin/posts", post);
  return typeof response["id"] === "string" ? response["id"] : "";
}

export async function deletePost(id: string): Promise<void> {
  await request(`/api/admin/posts/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export async function saveStats(
  items: { value: string; label: string }[],
): Promise<void> {
  await postJson("/api/admin/stats", { items });
}

export async function uploadImage(file: Blob): Promise<string> {
  const form = new FormData();
  form.set("image", file, "image.jpg");
  const response = await request("/api/admin/upload", {
    method: "POST",
    body: form,
  });
  if (typeof response["url"] !== "string") {
    throw new AdminApiError("Không nhận được đường dẫn ảnh.", 502);
  }
  return response["url"];
}
