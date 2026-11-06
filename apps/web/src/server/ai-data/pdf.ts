import { extractText, getDocumentProxy } from "unpdf";

const MAX_BYTES = 60 * 1024 * 1024;
const CHARS_PER_TOKEN = 3;
const TOKEN_LIMIT = 220_000;

export class SourceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SourceError";
  }
}

export interface SourceText {
  readonly text: string;
  readonly pageCount: number;
  readonly estimatedTokens: number;
}

function isPrivateHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return (
    host === "localhost" ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    /^127\./.test(host) ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^169\.254\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
    host === "::1" ||
    host === "[::1]"
  );
}

export function assertPdfBytes(bytes: Uint8Array): void {
  if (bytes.byteLength > MAX_BYTES) {
    throw new SourceError("Tệp PDF lớn hơn 60 MB.");
  }
  const header = new TextDecoder().decode(bytes.slice(0, 5));
  if (header !== "%PDF-") {
    throw new SourceError(
      "Nguồn không phải tệp PDF. Nếu dùng đường dẫn, hãy dùng link trực tiếp tới tệp .pdf, không phải trang web.",
    );
  }
}

export async function downloadPdf(link: string): Promise<Uint8Array> {
  let url: URL;
  try {
    url = new URL(link);
  } catch {
    throw new SourceError("Đường dẫn PDF không hợp lệ.");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new SourceError("Đường dẫn PDF phải bắt đầu bằng http hoặc https.");
  }
  if (isPrivateHost(url.hostname)) {
    throw new SourceError("Không tải được từ địa chỉ nội bộ.");
  }
  let response: Response;
  try {
    response = await fetch(url, {
      headers: { "User-Agent": "esg-test-data-tool" },
      redirect: "follow",
    });
  } catch {
    throw new SourceError("Không kết nối được tới đường dẫn PDF.");
  }
  if (!response.ok) {
    throw new SourceError(`Không tải được PDF (HTTP ${response.status}).`);
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  assertPdfBytes(bytes);
  return bytes;
}

function parseRange(range: string | undefined, total: number): [number, number] {
  if (range === undefined || range.trim() === "") {
    return [1, total];
  }
  const match = /^(\d+)\s*-\s*(\d+)$/.exec(range.trim());
  if (match === null) {
    throw new SourceError("Khoảng trang phải có dạng 60-160.");
  }
  const from = Math.max(1, Number(match[1]));
  const to = Math.min(total, Number(match[2]));
  if (from > to) {
    throw new SourceError(`Khoảng trang nằm ngoài tài liệu (${total} trang).`);
  }
  return [from, to];
}

export async function extractSource(
  bytes: Uint8Array,
  range: string | undefined,
): Promise<SourceText> {
  const pdf = await getDocumentProxy(new Uint8Array(bytes));
  const { totalPages, text } = await extractText(pdf, { mergePages: false });
  const [from, to] = parseRange(range, totalPages);

  const parts: string[] = [];
  for (let page = from; page <= to; page += 1) {
    parts.push(`[Trang ${page}]\n${(text[page - 1] ?? "").trim()}`);
  }
  const joined = parts.join("\n");
  const characters = joined.replace(/\[Trang \d+\]/g, "").trim().length;
  if (characters < 20 * (to - from + 1)) {
    throw new SourceError(
      "PDF gần như không có chữ (có thể là bản scan). Cần PDF có chữ chọn được.",
    );
  }
  const estimatedTokens = Math.ceil(joined.length / CHARS_PER_TOKEN);
  if (estimatedTokens > TOKEN_LIMIT) {
    throw new SourceError(
      `Tài liệu dài khoảng ${estimatedTokens.toLocaleString("en-US")} token, vượt giới hạn của bản miễn phí. Hãy nhập khoảng trang cần đọc (tài liệu có ${totalPages} trang), ví dụ 60-160.`,
    );
  }
  return { text: joined, pageCount: to - from + 1, estimatedTokens };
}
