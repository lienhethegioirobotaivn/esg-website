import assert from "node:assert/strict";
import { after, before, beforeEach, describe, it } from "node:test";

import {
  DEFAULT_REPORT_THEME,
  EMPTY_PLAN,
  REPORT_ARCHIVE_LIMITS,
  buildReportSnapshot,
} from "@esg/shared";

import { archiveReport, splitBlob } from "../../src/features/survey/lib/report-archive";
import type { ArchiveInput } from "../../src/features/survey/lib/report-archive";

process.env["GOOGLE_SHEET_QUESTIONS_ID"] = "sheet";
process.env["GOOGLE_APPS_SCRIPT_URL"] = "https://script.example/exec";
process.env["GOOGLE_APPS_SCRIPT_SECRET"] = "secret";

const CHUNK = REPORT_ARCHIVE_LIMITS.chunkBytes;
const APPS_SCRIPT = "https://script.example/exec";

type RouteModule = { POST: (request: Request) => Promise<Response> };

interface AppsCall {
  action: string;
  [key: string]: unknown;
}

let uploadRoute: RouteModule;
let finishRoute: RouteModule;
let appsCalls: AppsCall[];
let appsHandler: (call: AppsCall) => Response;
let failChunkAttempts: number;
const realFetch = globalThis.fetch;

function ok(extra: Record<string, unknown> = {}): Response {
  return new Response(JSON.stringify({ ok: true, ...extra }));
}

function pdf(size: number): Blob {
  const bytes = new Uint8Array(size);
  bytes.set(Buffer.from("%PDF-1.7\n"));
  return new Blob([bytes], { type: "application/pdf" });
}

function docx(size: number): Blob {
  const bytes = new Uint8Array(size);
  bytes.set([0x50, 0x4b, 0x03, 0x04]);
  return new Blob([bytes]);
}

function input(files: ArchiveInput["files"]): ArchiveInput {
  return {
    reportCode: "ESG-20261117-AB12",
    files,
    locale: "vi",
    isDraft: true,
    isBrandTheme: false,
    companyName: "Công ty ABC",
    snapshot: buildReportSnapshot({
      company: { name: "ABC" },
      answers: { "C-001": { value: "yes", number: "", description: "" } },
      plan: EMPTY_PLAN,
      theme: DEFAULT_REPORT_THEME,
      locale: "vi",
      savedAt: "2026-11-17T03:00:00.000Z",
    }),
  };
}

before(async () => {
  uploadRoute = (await import("../../src/app/api/reports/upload/route")) as RouteModule;
  finishRoute = (await import("../../src/app/api/reports/finish/route")) as RouteModule;
});

after(() => {
  globalThis.fetch = realFetch;
});

beforeEach(() => {
  appsCalls = [];
  failChunkAttempts = 0;
  appsHandler = (call) => (call.action === "finishReport" ? ok({ exportId: "RX-20261117-ABCDEF", fileIds: {} }) : ok());
  globalThis.fetch = (async (target: string | URL | Request, init?: RequestInit) => {
    const url = typeof target === "string" ? target : target instanceof URL ? target.href : target.url;
    if (url === APPS_SCRIPT) {
      const call = JSON.parse(String(init?.body)) as AppsCall;
      appsCalls.push(call);
      if (call.action === "uploadReportChunk" && failChunkAttempts > 0) {
        failChunkAttempts -= 1;
        return new Response("boom", { status: 500 });
      }
      return appsHandler(call);
    }
    const request = new Request(`http://localhost${url}`, init);
    if (url === "/api/reports/upload") return uploadRoute.POST(request);
    if (url === "/api/reports/finish") return finishRoute.POST(request);
    throw new Error(`unexpected fetch ${url}`);
  }) as typeof fetch;
});

describe("splitBlob", () => {
  it("splits into chunk sized parts and keeps the bytes", async () => {
    const blob = pdf(CHUNK * 2 + 10);
    const parts = splitBlob(blob);
    assert.deepEqual(parts.map((part) => part.size), [CHUNK, CHUNK, 10]);
    const joined = Buffer.concat(await Promise.all(parts.map(async (part) => Buffer.from(await part.arrayBuffer()))));
    assert.ok(joined.equals(Buffer.from(await blob.arrayBuffer())));
    assert.equal(splitBlob(pdf(10)).length, 1);
    assert.equal(splitBlob(pdf(CHUNK)).length, 1);
  });
});

describe("archiveReport through the real routes", () => {
  it("uploads every chunk then finishes with consistent metadata", async () => {
    const { exportId } = await archiveReport(
      input([
        { format: "pdf", name: "bao-cao.pdf", blob: pdf(CHUNK * 2 + 100) },
        { format: "docx", name: "bao-cao.docx", blob: docx(500) },
      ]),
      0,
    );
    assert.equal(exportId, "RX-20261117-ABCDEF");
    const chunks = appsCalls.filter((call) => call.action === "uploadReportChunk");
    const finish = appsCalls.find((call) => call.action === "finishReport");
    assert.equal(chunks.length, 4);
    assert.deepEqual(chunks.map((call) => [call["format"], call["index"]]), [["pdf", 0], ["pdf", 1], ["pdf", 2], ["docx", 0]]);
    assert.equal(new Set(chunks.map((call) => call["uploadId"])).size, 1);
    assert.equal(chunks[0]?.["uploadId"], finish?.["uploadId"]);
    const first = Buffer.from(String(chunks[0]?.["data"]), "base64");
    assert.equal(first.length, CHUNK);
    assert.equal(first.subarray(0, 5).toString(), "%PDF-");
    assert.equal(finish?.["status"], "draft");
    assert.equal(finish?.["theme"], "default");
    assert.equal(finish?.["reportCode"], "ESG-20261117-AB12");
    assert.deepEqual(finish?.["files"], [
      { format: "pdf", name: "bao-cao.pdf", bytes: CHUNK * 2 + 100, chunks: 3 },
      { format: "docx", name: "bao-cao.docx", bytes: 500, chunks: 1 },
    ]);
    assert.equal(typeof finish?.["snapshot"], "string");
    assert.equal(finish?.["secret"], "secret");
  });

  it("retries a failed chunk and succeeds", async () => {
    failChunkAttempts = 2;
    const result = await archiveReport(input([{ format: "pdf", name: "a.pdf", blob: pdf(1000) }]), 0);
    assert.equal(result.exportId, "RX-20261117-ABCDEF");
    assert.equal(appsCalls.filter((call) => call.action === "uploadReportChunk").length, 3);
  });

  it("gives up after three failed attempts", async () => {
    failChunkAttempts = 5;
    await assert.rejects(archiveReport(input([{ format: "pdf", name: "a.pdf", blob: pdf(1000) }]), 0));
    assert.equal(appsCalls.filter((call) => call.action === "finishReport").length, 0);
  });

  it("does not retry client errors", async () => {
    await assert.rejects(archiveReport(input([{ format: "pdf", name: "a.pdf", blob: new Blob(["not a pdf"]) }]), 0));
    assert.equal(appsCalls.length, 0);
  });

  it("rejects an empty file before sending anything", async () => {
    await assert.rejects(archiveReport(input([{ format: "pdf", name: "a.pdf", blob: new Blob([]) }]), 0));
    assert.equal(appsCalls.length, 0);
  });

  it("fails when Apps Script rejects the finish step", async () => {
    appsHandler = (call) =>
      call.action === "finishReport"
        ? new Response(JSON.stringify({ ok: false, error: "Chưa có hồ sơ doanh nghiệp cho mã báo cáo này." }))
        : ok();
    await assert.rejects(archiveReport(input([{ format: "pdf", name: "a.pdf", blob: pdf(1000) }]), 0));
  });

  it("marks a brand theme", async () => {
    await archiveReport({ ...input([{ format: "pdf", name: "a.pdf", blob: pdf(100) }]), isBrandTheme: true, isDraft: false }, 0);
    const finish = appsCalls.find((call) => call.action === "finishReport");
    assert.equal(finish?.["theme"], "brand");
    assert.equal(finish?.["status"], "complete");
  });
});

describe("route validation", () => {
  function chunkForm(fields: Record<string, string>, chunk: Blob | null) {
    const form = new FormData();
    for (const [key, value] of Object.entries(fields)) form.append(key, value);
    if (chunk) form.append("chunk", chunk, "x.part");
    return new Request("http://localhost/api/reports/upload", { method: "POST", body: form });
  }
  const base = { uploadId: "3b241101-e2bb-4255-8caf-4136c566a962", format: "pdf", index: "0", total: "1" };

  it("rejects a chunk without a PDF signature at index 0", async () => {
    const response = await uploadRoute.POST(chunkForm(base, new Blob(["hello"])));
    assert.equal(response.status, 400);
    assert.equal(appsCalls.length, 0);
  });

  it("rejects a non final chunk with the wrong size", async () => {
    const response = await uploadRoute.POST(chunkForm({ ...base, total: "2" }, pdf(1000)));
    assert.equal(response.status, 400);
  });

  it("rejects bad fields, missing chunk and index beyond total", async () => {
    assert.equal((await uploadRoute.POST(chunkForm({ ...base, uploadId: "x" }, pdf(10)))).status, 400);
    assert.equal((await uploadRoute.POST(chunkForm(base, null))).status, 400);
    assert.equal((await uploadRoute.POST(chunkForm({ ...base, index: "1" }, pdf(10)))).status, 400);
    assert.equal((await uploadRoute.POST(chunkForm(base, new Blob([])))).status, 400);
  });

  it("rejects an oversized declared body", async () => {
    const request = new Request("http://localhost/api/reports/upload", {
      method: "POST",
      headers: { "content-length": String(CHUNK + 1_000_000) },
      body: new FormData(),
    });
    assert.equal((await uploadRoute.POST(request)).status, 413);
  });

  it("rejects a finish body with an invalid snapshot", async () => {
    const payload = {
      uploadId: "3b241101-e2bb-4255-8caf-4136c566a962",
      reportCode: "ESG-20261117-AB12",
      locale: "vi",
      status: "complete",
      theme: "default",
      companyName: "A",
      snapshot: JSON.stringify({ version: 9 }),
      files: [{ format: "pdf", name: "a.pdf", bytes: 10, chunks: 1 }],
    };
    const request = new Request("http://localhost/api/reports/finish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    assert.equal((await finishRoute.POST(request)).status, 400);
    assert.equal(appsCalls.length, 0);
  });

  it("rejects malformed finish json", async () => {
    const request = new Request("http://localhost/api/reports/finish", { method: "POST", body: "{" });
    assert.equal((await finishRoute.POST(request)).status, 400);
  });

  it("answers 429 once the per IP chunk limit is used up", async () => {
    let status = 0;
    for (let i = 0; i < 90 && status !== 429; i += 1) {
      const request = chunkForm(base, pdf(100));
      request.headers.set("x-forwarded-for", "9.9.9.9");
      status = (await uploadRoute.POST(request)).status;
    }
    assert.equal(status, 429);
  });
});
