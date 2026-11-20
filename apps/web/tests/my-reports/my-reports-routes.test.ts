import assert from "node:assert/strict";
import { after, before, beforeEach, describe, it } from "node:test";

process.env["GOOGLE_SHEET_QUESTIONS_ID"] = "sheet";
process.env["GOOGLE_APPS_SCRIPT_URL"] = "https://script.example/exec";
process.env["GOOGLE_APPS_SCRIPT_SECRET"] = "secret";
process.env["USER_SESSION_SECRET"] = "0123456789abcdef0123456789abcdef";

const APPS_SCRIPT = "https://script.example/exec";
const EXPORT_ID = "RX-20261118-AAAAAA";

interface Context {
  params: Promise<{ id: string }>;
}
type Handler = (request: Request, context: Context) => Promise<Response>;

interface AppsCall {
  action: string;
  [key: string]: unknown;
}

let listRoute: { GET: (request: Request) => Promise<Response> };
let fileRoute: { GET: Handler };
let snapshotRoute: { GET: Handler };
let deleteRoute: { DELETE: Handler };
let verifyRoute: { POST: (request: Request) => Promise<Response> };
let appsCalls: AppsCall[];
let appsReply: (call: AppsCall) => Record<string, unknown>;
const realFetch = globalThis.fetch;
const jar = (): Map<string, string> =>
  (globalThis as unknown as { __testCookieJar: Map<string, string> }).__testCookieJar;

let ipCounter = 0;

function req(url: string, method = "GET"): Request {
  ipCounter += 1;
  return new Request(`http://localhost${url}`, {
    method,
    headers: { "x-forwarded-for": `10.1.0.${ipCounter}` },
  });
}

function ctx(id: string = EXPORT_ID): Context {
  return { params: Promise.resolve({ id }) };
}

async function login(email = "a@b.vn"): Promise<void> {
  const previous = appsReply;
  appsReply = () => ({ status: "verified" });
  ipCounter += 1;
  const response = await verifyRoute.POST(
    new Request("http://localhost/api/auth/email/verify", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": `10.2.0.${ipCounter}` },
      body: JSON.stringify({ email, code: "123456" }),
    }),
  );
  assert.equal(response.status, 200);
  appsReply = previous;
}

function listItem(overrides: Record<string, unknown> = {}) {
  return {
    exportId: EXPORT_ID,
    reportCode: "ESG-20261118-AB12",
    time: "2026-11-18 10:00:00",
    locale: "vi",
    status: "complete",
    company: "ABC",
    theme: "default",
    pdf: true,
    docx: true,
    ...overrides,
  };
}

function snapshot() {
  return {
    version: 1,
    savedAt: "2026-11-18T00:00:00.000Z",
    locale: "vi",
    company: { "Doanh nghiệp": "ABC" },
    answers: {},
    activeGroupId: null,
    plan: { tasks: [], goal: "", resources: "", reviewCycle: "" },
    theme: null,
  };
}

before(async () => {
  listRoute = (await import("../../src/app/api/my-reports/route")) as typeof listRoute;
  fileRoute = (await import("../../src/app/api/my-reports/[id]/file/route")) as typeof fileRoute;
  snapshotRoute = (await import("../../src/app/api/my-reports/[id]/snapshot/route")) as typeof snapshotRoute;
  deleteRoute = (await import("../../src/app/api/my-reports/[id]/route")) as typeof deleteRoute;
  verifyRoute = (await import("../../src/app/api/auth/email/verify/route")) as typeof verifyRoute;
});

after(() => {
  globalThis.fetch = realFetch;
});

beforeEach(() => {
  jar().clear();
  appsCalls = [];
  appsReply = () => ({});
  globalThis.fetch = (async (target: string | URL | Request, init?: RequestInit) => {
    const url = typeof target === "string" ? target : target instanceof URL ? target.href : target.url;
    if (url !== APPS_SCRIPT) {
      throw new Error(`unexpected fetch ${url}`);
    }
    const call = JSON.parse(String(init?.body)) as AppsCall;
    appsCalls.push(call);
    return new Response(JSON.stringify({ ok: true, ...appsReply(call) }));
  }) as typeof fetch;
});

describe("my-reports without a session", () => {
  it("rejects every route with 401 and never calls Apps Script", async () => {
    assert.equal((await listRoute.GET(req("/api/my-reports"))).status, 401);
    assert.equal((await fileRoute.GET(req(`/api/my-reports/${EXPORT_ID}/file?format=pdf`), ctx())).status, 401);
    assert.equal((await snapshotRoute.GET(req(`/api/my-reports/${EXPORT_ID}/snapshot`), ctx())).status, 401);
    assert.equal((await deleteRoute.DELETE(req(`/api/my-reports/${EXPORT_ID}`, "DELETE"), ctx())).status, 401);
    assert.equal(appsCalls.length, 0);
  });

  it("rejects a forged cookie", async () => {
    jar().set("esg-user", "forged.value");
    assert.equal((await listRoute.GET(req("/api/my-reports"))).status, 401);
    assert.equal(appsCalls.length, 0);
  });
});

describe("GET /api/my-reports", () => {
  it("lists with the cookie email, never one from the client", async () => {
    await login("a@b.vn");
    appsReply = () => ({ reports: [listItem()] });
    const response = await listRoute.GET(req("/api/my-reports?email=x@y.vn"));
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "private, no-store");
    const body = (await response.json()) as { email: string; reports: unknown[] };
    assert.equal(body.email, "a@b.vn");
    assert.equal(body.reports.length, 1);
    assert.equal(appsCalls.at(-1)?.["email"], "a@b.vn");
  });

  it("returns 502 when Apps Script sends a malformed list", async () => {
    await login();
    appsReply = () => ({ reports: [{ exportId: "bad" }] });
    assert.equal((await listRoute.GET(req("/api/my-reports"))).status, 502);
  });
});

describe("GET /api/my-reports/[id]/file", () => {
  it("rejects bad ids and bad formats without calling Apps Script", async () => {
    await login();
    const before = appsCalls.length;
    assert.equal((await fileRoute.GET(req("/api/my-reports/x/file?format=pdf"), ctx("x"))).status, 404);
    assert.equal((await fileRoute.GET(req(`/api/my-reports/${EXPORT_ID}/file?format=exe`), ctx())).status, 400);
    assert.equal(appsCalls.length, before);
  });

  it("streams every chunk in order with download headers", async () => {
    await login();
    const parts = [Buffer.from("%PDF-1-part-A"), Buffer.from("part-B"), Buffer.from("part-C")];
    appsReply = (call) => {
      const index = call["index"] as number;
      return {
        status: "ok",
        name: "RX-20261118-AAAAAA_bao-cao.pdf",
        size: parts.reduce((sum, part) => sum + part.length, 0),
        total: parts.length,
        data: parts[index]?.toString("base64"),
      };
    };
    const response = await fileRoute.GET(req(`/api/my-reports/${EXPORT_ID}/file?format=pdf`), ctx());
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("content-type"), "application/pdf");
    assert.equal(response.headers.get("content-length"), String(Buffer.concat(parts).length));
    assert.match(response.headers.get("content-disposition") ?? "", /attachment; filename="RX-20261118-AAAAAA_bao-cao\.pdf"/);
    assert.equal(response.headers.get("x-content-type-options"), "nosniff");
    const body = Buffer.from(await response.arrayBuffer());
    assert.ok(body.equals(Buffer.concat(parts)));
    const fileCalls = appsCalls.filter((call) => call.action === "getOwnerReportFile");
    assert.deepEqual(fileCalls.map((call) => call["index"]), [0, 1, 2]);
    assert.ok(fileCalls.every((call) => call["email"] === "a@b.vn" && call["format"] === "pdf"));
  });

  it("returns 404 when the file is missing for that owner", async () => {
    await login();
    appsReply = () => ({ status: "missing" });
    assert.equal((await fileRoute.GET(req(`/api/my-reports/${EXPORT_ID}/file?format=docx`), ctx())).status, 404);
  });
});

describe("GET /api/my-reports/[id]/snapshot", () => {
  it("returns the validated snapshot and the report code", async () => {
    await login();
    appsReply = (call) =>
      call.action === "listOwnerReports"
        ? { reports: [listItem()] }
        : { status: "ok", snapshot: JSON.stringify(snapshot()) };
    const response = await snapshotRoute.GET(req(`/api/my-reports/${EXPORT_ID}/snapshot`), ctx());
    assert.equal(response.status, 200);
    const body = (await response.json()) as { reportCode: string; snapshot: { version: number } };
    assert.equal(body.reportCode, "ESG-20261118-AB12");
    assert.equal(body.snapshot.version, 1);
  });

  it("returns 404 for a report that is not in the owner's list", async () => {
    await login();
    appsReply = (call) => (call.action === "listOwnerReports" ? { reports: [] } : { status: "ok", snapshot: "{}" });
    assert.equal((await snapshotRoute.GET(req(`/api/my-reports/${EXPORT_ID}/snapshot`), ctx())).status, 404);
    assert.equal(appsCalls.some((call) => call.action === "getOwnerSnapshot"), false);
  });

  it("returns 422 when the stored snapshot is not valid", async () => {
    await login();
    appsReply = (call) =>
      call.action === "listOwnerReports" ? { reports: [listItem()] } : { status: "ok", snapshot: "{\"version\":9}" };
    assert.equal((await snapshotRoute.GET(req(`/api/my-reports/${EXPORT_ID}/snapshot`), ctx())).status, 422);
  });
});

describe("DELETE /api/my-reports/[id]", () => {
  it("deletes through Apps Script with the cookie email", async () => {
    await login("a@b.vn");
    appsReply = () => ({ status: "deleted" });
    const response = await deleteRoute.DELETE(req(`/api/my-reports/${EXPORT_ID}`, "DELETE"), ctx());
    assert.equal(response.status, 200);
    const call = appsCalls.at(-1);
    assert.equal(call?.action, "deleteOwnerReport");
    assert.equal(call?.["email"], "a@b.vn");
    assert.equal(call?.["exportId"], EXPORT_ID);
  });

  it("returns 404 when it is not the owner's report", async () => {
    await login();
    appsReply = () => ({ status: "missing" });
    assert.equal((await deleteRoute.DELETE(req(`/api/my-reports/${EXPORT_ID}`, "DELETE"), ctx())).status, 404);
  });

  it("limits deletes per IP", async () => {
    await login();
    appsReply = () => ({ status: "deleted" });
    const statuses: number[] = [];
    for (let i = 0; i < 25; i += 1) {
      const request = new Request(`http://localhost/api/my-reports/${EXPORT_ID}`, {
        method: "DELETE",
        headers: { "x-forwarded-for": "10.9.9.9" },
      });
      statuses.push((await deleteRoute.DELETE(request, ctx())).status);
    }
    assert.equal(statuses.filter((status) => status === 429).length, 5);
  });
});
