import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { extractText, getDocumentProxy } from "unpdf";

const MAX_BYTES = 60 * 1024 * 1024;
const CHARS_PER_TOKEN = 3;
const TOKEN_LIMIT = 220_000;

export interface LoadedSource {
  readonly text: string;
  readonly pageCount: number;
  readonly sourceUrl: string;
  readonly estimatedTokens: number;
}

function parseRange(range: string | undefined, total: number): [number, number] {
  if (range === undefined) {
    return [1, total];
  }
  const match = /^(\d+)-(\d+)$/.exec(range.trim());
  if (match === null) {
    throw new Error(`--pages phải có dạng 100-160, nhận được: ${range}`);
  }
  const from = Math.max(1, Number(match[1]));
  const to = Math.min(total, Number(match[2]));
  if (from > to) {
    throw new Error(`--pages ${range} nằm ngoài tài liệu (${total} trang).`);
  }
  return [from, to];
}

async function readBytes(source: string): Promise<{ bytes: Uint8Array; url: string }> {
  if (/^https?:\/\//i.test(source)) {
    const response = await fetch(source, {
      headers: { "User-Agent": "esg-test-data-tool" },
      redirect: "follow",
    });
    if (!response.ok) {
      throw new Error(`Không tải được PDF (HTTP ${response.status}): ${source}`);
    }
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength > MAX_BYTES) {
      throw new Error("PDF lớn hơn 60 MB, hãy dùng --pages với tệp đã cắt nhỏ.");
    }
    const header = new TextDecoder().decode(bytes.slice(0, 5));
    if (header !== "%PDF-") {
      throw new Error(
        "Đường dẫn không trả về tệp PDF (có thể là trang web). Hãy dùng link trực tiếp tới tệp .pdf.",
      );
    }
    return { bytes, url: source };
  }
  return { bytes: new Uint8Array(await readFile(source)), url: "" };
}

export async function loadSource(input: {
  readonly source: string;
  readonly dir: string;
  readonly pages: string | undefined;
}): Promise<LoadedSource> {
  const { bytes, url } = await readBytes(input.source);
  await mkdir(input.dir, { recursive: true });
  await writeFile(join(input.dir, "source.pdf"), bytes);

  const pdf = await getDocumentProxy(new Uint8Array(bytes));
  const { totalPages, text } = await extractText(pdf, { mergePages: false });
  const [from, to] = parseRange(input.pages, totalPages);

  const parts: string[] = [];
  for (let page = from; page <= to; page += 1) {
    parts.push(`[Trang ${page}]\n${(text[page - 1] ?? "").trim()}`);
  }
  const joined = parts.join("\n");
  const characters = joined.replace(/\[Trang \d+\]/g, "").trim().length;
  if (characters < 200 * (to - from + 1) * 0.1) {
    throw new Error(
      "PDF gần như không có chữ (có thể là bản scan). Cần PDF có thể chọn được chữ.",
    );
  }
  const estimatedTokens = Math.ceil(joined.length / CHARS_PER_TOKEN);
  if (estimatedTokens > TOKEN_LIMIT) {
    throw new Error(
      `Tài liệu khoảng ${estimatedTokens.toLocaleString("en-US")} token, vượt giới hạn ${TOKEN_LIMIT.toLocaleString("en-US")} của bản free. Dùng --pages để chọn phần cần đọc, ví dụ --pages 60-160 (tài liệu có ${totalPages} trang).`,
    );
  }

  await writeFile(join(input.dir, "source.txt"), joined, "utf8");
  return { text: joined, pageCount: to - from + 1, sourceUrl: url, estimatedTokens };
}
