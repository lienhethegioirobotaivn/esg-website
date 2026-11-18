import assert from "node:assert/strict";
import { after, before, beforeEach, describe, it } from "node:test";

process.env["GOOGLE_SHEET_QUESTIONS_ID"] = "sheet";
process.env["GOOGLE_APPS_SCRIPT_URL"] = "https://script.example/exec";
process.env["GOOGLE_APPS_SCRIPT_SECRET"] = "secret";
process.env["USER_SESSION_SECRET"] = "0123456789abcdef0123456789abcdef";

const APPS_SCRIPT = "https://script.example/exec";

type Handler = (request: Request) => Promise<Response>;

interface AppsCall {
  action: string;
  [key: string]: unknown;
}

let requestRoute: { POST: Handler };
let verifyRoute: { POST: Handler };
let meRoute: { GET: () => Promise<Response> };
let logoutRoute: { POST: () => Promise<Response> };
let attachRoute: { POST: Handler };
let finishRoute: { POST: Handler };
let appsCalls: AppsCall[];
let appsReply: (call: AppsCall) => Record<string, unknown>;
const realFetch = globalThis.fetch;
const jar = (): Map<string, string> =>
  (globalThis as unknown as { __testCookieJar: Map<string, string> }).__testCookieJar;

let ipCounter = 0;

function post(url: string, body: unknown, ip?: string): Request {
  ipCounter += 1;
  return new Request(`http://localhost${url}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": ip ?? `10.0.0.${ipCounter}`,
    },
    body: JSON.stringify(body),
  });
}

async function json(response: Response): Promise<Record<string, unknown>> {
  return (await response.json()) as Record<string, unknown>;
}

function errorOf(body: Record<string, unknown>): Record<string, unknown> {
  return body["error"] as Record<string, unknown>;
}

async function login(email = "a@b.vn"): Promise<void> {
  appsReply = () => ({ status: "verified" });
  const response = await verifyRoute.POST(post("/api/auth/email/verify", { email, code: "123456" }));
  assert.equal(response.status, 200);
}

function finishPayload() {
  return {
    uploadId: "3b241101-e2bb-4255-8caf-4136c566a962",
    reportCode: "ESG-20261117-AB12",
    locale: "vi",
    status: "complete",
    theme: "default",
    companyName: "ABC",
    snapshot: JSON.stringify({
      version: 1,
      savedAt: "2026-11-17T00:00:00.000Z",
      locale: "vi",
      company: {},
      answers: {},
      activeGroupId: null,
      plan: { tasks: [], goal: "", resources: "", reviewCycle: "" },
      theme: null,
    }),
    files: [{ format: "pdf", name: "a.pdf", bytes: 100, chunks: 1 }],
  };
}

before(async () => {
  requestRoute = (await import("../../src/app/api/auth/email/request/route")) as typeof requestRoute;
  verifyRoute = (await import("../../src/app/api/auth/email/verify/route")) as typeof verifyRoute;
  meRoute = (await import("../../src/app/api/auth/me/route")) as typeof meRoute;
  logoutRoute = (await import("../../src/app/api/auth/logout/route")) as typeof logoutRoute;
  attachRoute = (await import("../../src/app/api/reports/attach/route")) as typeof attachRoute;
  finishRoute = (await import("../../src/app/api/reports/finish/route")) as typeof finishRoute;
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

describe("POST /api/auth/email/request", () => {
  it("sends a localized mail template with a code placeholder", async () => {
    appsReply = () => ({ status: "sent", resendAfter: 60, expiresIn: 600 });
    const response = await requestRoute.POST(post("/api/auth/email/request", { email: " User@Example.com ", locale: "fr" }));
    assert.equal(response.status, 200);
    assert.deepEqual(await json(response), { resendAfter: 60, expiresIn: 600 });
    const call = appsCalls[0];
    assert.equal(call?.action, "otpRequest");
    assert.equal(call?.["email"], "user@example.com");
    assert.match(String(call?.["subject"]), /Code de vérification/);
    assert.ok(String(call?.["text"]).includes("{code}"));
    assert.ok(String(call?.["text"]).includes("10 minutes"));
    assert.equal(call?.["secret"], "secret");
  });

  it("builds the mail in every supported language", async () => {
    appsReply = () => ({ status: "sent" });
    const subjects = new Set<string>();
    for (const locale of ["vi", "en", "fr", "zh"]) {
      await requestRoute.POST(post("/api/auth/email/request", { email: "a@b.vn", locale }));
    }
    for (const call of appsCalls) {
      subjects.add(String(call["subject"]));
      assert.ok(String(call["text"]).includes("{code}"));
    }
    assert.equal(subjects.size, 4);
  });

  it("rejects invalid input without calling Apps Script", async () => {
    const response = await requestRoute.POST(post("/api/auth/email/request", { email: "nope", locale: "vi" }));
    assert.equal(response.status, 400);
    assert.equal(appsCalls.length, 0);
    const bad = await requestRoute.POST(post("/api/auth/email/request", { email: "a@b.vn", locale: "xx" }));
    assert.equal(bad.status, 400);
  });

  it("maps Apps Script limit statuses to HTTP errors", async () => {
    appsReply = () => ({ status: "wait", retryAfter: 42 });
    const wait = await requestRoute.POST(post("/api/auth/email/request", { email: "a@b.vn", locale: "vi" }));
    assert.equal(wait.status, 429);
    assert.equal(errorOf(await json(wait))["retryAfter"], 42);

    appsReply = () => ({ status: "hourly-limit", retryAfter: 1800 });
    const hourly = await requestRoute.POST(post("/api/auth/email/request", { email: "a@b.vn", locale: "vi" }));
    assert.equal(hourly.status, 429);
    assert.equal(errorOf(await json(hourly))["retryAfter"], 1800);

    appsReply = () => ({ status: "daily-limit" });
    const daily = await requestRoute.POST(post("/api/auth/email/request", { email: "a@b.vn", locale: "vi" }));
    assert.equal(daily.status, 503);
  });

  it("returns a generic error when Apps Script fails", async () => {
    globalThis.fetch = (async () => new Response("boom", { status: 500 })) as typeof fetch;
    const response = await requestRoute.POST(post("/api/auth/email/request", { email: "a@b.vn", locale: "vi" }));
    assert.equal(response.status, 502);
    assert.equal(errorOf(await json(response))["message"], "Chưa gửi được mã xác nhận. Vui lòng thử lại sau.");
  });

  it("limits requests per IP", async () => {
    appsReply = () => ({ status: "sent" });
    const statuses: number[] = [];
    for (let i = 0; i < 8; i++) {
      const response = await requestRoute.POST(post("/api/auth/email/request", { email: "a@b.vn", locale: "vi" }, "203.0.113.9"));
      statuses.push(response.status);
    }
    assert.deepEqual(statuses, [200, 200, 200, 200, 200, 200, 429, 429]);
  });
});

describe("POST /api/auth/email/verify", () => {
  it("starts a session only when the code is verified", async () => {
    appsReply = () => ({ status: "verified" });
    const response = await verifyRoute.POST(post("/api/auth/email/verify", { email: "A@b.vn", code: "123456" }));
    assert.equal(response.status, 200);
    assert.deepEqual(await json(response), { email: "a@b.vn" });
    assert.equal(appsCalls[0]?.["email"], "a@b.vn");
    assert.equal(appsCalls[0]?.["code"], "123456");
    assert.ok(jar().has("esg-user"));
    const me = await meRoute.GET();
    assert.deepEqual(await json(me), { email: "a@b.vn" });
    assert.equal(me.headers.get("cache-control"), "private, no-store");
  });

  it("does not start a session on invalid, expired or locked codes", async () => {
    appsReply = () => ({ status: "invalid", triesLeft: 3 });
    const invalid = await verifyRoute.POST(post("/api/auth/email/verify", { email: "a@b.vn", code: "111111" }));
    assert.equal(invalid.status, 400);
    assert.equal(errorOf(await json(invalid))["triesLeft"], 3);

    appsReply = () => ({ status: "expired" });
    assert.equal((await verifyRoute.POST(post("/api/auth/email/verify", { email: "a@b.vn", code: "111111" }))).status, 410);

    appsReply = () => ({ status: "locked" });
    assert.equal((await verifyRoute.POST(post("/api/auth/email/verify", { email: "a@b.vn", code: "111111" }))).status, 429);

    assert.equal(jar().size, 0);
    assert.deepEqual(await json(await meRoute.GET()), { email: null });
  });

  it("rejects malformed codes before calling Apps Script", async () => {
    for (const code of ["12345", "abcdef", "1234567"]) {
      const response = await verifyRoute.POST(post("/api/auth/email/verify", { email: "a@b.vn", code }));
      assert.equal(response.status, 400);
    }
    assert.equal(appsCalls.length, 0);
  });

  it("ignores a tampered or foreign cookie", async () => {
    jar().set("esg-user", "eyJlIjoiZXZpbEBiLnZuIiwieCI6OTk5OTk5OTk5OTk5OTl9.invalidsignature");
    assert.deepEqual(await json(await meRoute.GET()), { email: null });
  });

  it("logs out by clearing the cookie", async () => {
    await login();
    assert.ok(jar().has("esg-user"));
    await logoutRoute.POST();
    assert.equal(jar().has("esg-user"), false);
    assert.deepEqual(await json(await meRoute.GET()), { email: null });
  });
});

describe("report ownership", () => {
  async function finishAndGetToken(): Promise<{ exportId: string; attachToken: string }> {
    appsReply = () => ({ exportId: "RX-20261117-ABCDEF", fileIds: {} });
    const response = await finishRoute.POST(post("/api/reports/finish", finishPayload()));
    assert.equal(response.status, 200);
    const body = await json(response);
    assert.equal(typeof body["attachToken"], "string");
    return { exportId: String(body["exportId"]), attachToken: String(body["attachToken"]) };
  }

  it("finish sends the verified email only when the session exists", async () => {
    const anonymous = await finishAndGetToken();
    assert.equal(appsCalls.at(-1)?.["email"], undefined);
    assert.equal(anonymous.exportId, "RX-20261117-ABCDEF");

    await login("owner@b.vn");
    appsCalls = [];
    await finishAndGetToken();
    assert.equal(appsCalls.at(-1)?.["email"], "owner@b.vn");
  });

  it("attach requires a session", async () => {
    const { exportId, attachToken } = await finishAndGetToken();
    appsCalls = [];
    const response = await attachRoute.POST(post("/api/reports/attach", { exportId, attachToken }));
    assert.equal(response.status, 401);
    assert.equal(appsCalls.length, 0);
  });

  it("attach rejects a token issued for another export or a forged token", async () => {
    const { attachToken } = await finishAndGetToken();
    await login();
    appsCalls = [];
    const other = await attachRoute.POST(post("/api/reports/attach", { exportId: "RX-20261117-ZZZZZZ", attachToken }));
    assert.equal(other.status, 403);
    const forged = await attachRoute.POST(post("/api/reports/attach", { exportId: "RX-20261117-ABCDEF", attachToken: `${Date.now()}.forged` }));
    assert.equal(forged.status, 403);
    assert.equal(appsCalls.length, 0);
  });

  it("attach uses the email from the cookie, never from the body", async () => {
    const { exportId, attachToken } = await finishAndGetToken();
    await login("me@b.vn");
    appsCalls = [];
    appsReply = () => ({ status: "attached" });
    const response = await attachRoute.POST(post("/api/reports/attach", { exportId, attachToken, email: "evil@b.vn" }));
    assert.equal(response.status, 200);
    assert.deepEqual(await json(response), { status: "attached" });
    assert.equal(appsCalls[0]?.action, "setReportOwner");
    assert.equal(appsCalls[0]?.["email"], "me@b.vn");
    assert.equal(appsCalls[0]?.["exportId"], exportId);
  });

  it("maps conflict and missing statuses", async () => {
    const { exportId, attachToken } = await finishAndGetToken();
    await login();
    appsReply = () => ({ status: "conflict" });
    assert.equal((await attachRoute.POST(post("/api/reports/attach", { exportId, attachToken }))).status, 409);
    appsReply = () => ({ status: "missing" });
    assert.equal((await attachRoute.POST(post("/api/reports/attach", { exportId, attachToken }))).status, 404);
  });
});
