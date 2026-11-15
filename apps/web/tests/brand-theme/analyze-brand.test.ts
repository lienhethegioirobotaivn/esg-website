import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { GeminiError } from "../../src/server/ai-data/gemini";
import type { JsonAnswer } from "../../src/server/ai-data/gemini";
import { analyzeBrand } from "../../src/server/brand-theme/analyze-brand";
import type { BrandGenerate } from "../../src/server/brand-theme/analyze-brand";
import { createRateWindow } from "../../src/server/brand-theme/limits";

const palette = [
  { hex: "#C0392B", share: 0.5 },
  { hex: "#102642", share: 0.3 },
  { hex: "#F2B705", share: 0.2 },
];
const images = [{ mimeType: "image/jpeg", bytes: new Uint8Array([1, 2, 3]) }];

function options(overrides: Partial<Parameters<typeof analyzeBrand>[0]> = {}) {
  return {
    images,
    palette,
    consent: true,
    apiKey: "key",
    model: "m",
    rate: { window: createRateWindow(), key: "ip", ipLimit: 5, dailyLimit: 30 },
    ...overrides,
  };
}

function answer(value: unknown): JsonAnswer {
  return { text: typeof value === "string" ? value : JSON.stringify(value), finishReason: "STOP" };
}

const goodSuggestion = {
  primary: "#C0392B",
  accent: "#102642",
  font: "serif",
  cover: "band",
  tableHead: "underline",
  kpi: "outline",
  radius: "soft",
  density: "airy",
};

describe("analyzeBrand", () => {
  it("returns an AI theme and sends images with the response schema", async () => {
    const calls: Parameters<BrandGenerate>[0][] = [];
    const generate: BrandGenerate = async (input) => {
      calls.push(input);
      return answer(goodSuggestion);
    };
    const result = await analyzeBrand(options({ generate }));
    assert.equal(result.source, "ai");
    assert.equal(result.reason, "none");
    assert.equal(result.theme.colors.primary, "#C0392B");
    assert.equal(result.theme.font, "serif");
    assert.equal(calls.length, 1);
    assert.equal(calls[0]?.images[0]?.data, Buffer.from([1, 2, 3]).toString("base64"));
    assert.notEqual(calls[0]?.responseSchema, undefined);
    assert.match(calls[0]?.prompt ?? "", /#C0392B/);
  });

  it("snaps colors outside the palette to the nearest palette color", async () => {
    const generate: BrandGenerate = async () =>
      answer({ ...goodSuggestion, primary: "#FF00FF", accent: "#00FFFF" });
    const result = await analyzeBrand(options({ generate }));
    const allowed = palette.map((color) => color.hex);
    assert.ok(allowed.includes(result.theme.colors.primary));
    assert.ok(allowed.includes(result.theme.colors.accent));
  });

  it("falls back to the palette without consent and never calls Gemini", async () => {
    let called = false;
    const generate: BrandGenerate = async () => {
      called = true;
      return answer(goodSuggestion);
    };
    const result = await analyzeBrand(options({ consent: false, generate }));
    assert.equal(result.source, "palette");
    assert.equal(result.reason, "no-consent");
    assert.equal(called, false);
  });

  it("falls back when no API key is configured", async () => {
    const result = await analyzeBrand(options({ apiKey: undefined }));
    assert.equal(result.reason, "not-configured");
    assert.equal(result.source, "palette");
  });

  it("falls back when Gemini returns 429", async () => {
    const generate: BrandGenerate = async () => {
      throw new GeminiError("limit", 429);
    };
    const result = await analyzeBrand(options({ generate }));
    assert.equal(result.reason, "quota");
    assert.equal(result.source, "palette");
  });

  it("retries once without the response schema on a 400", async () => {
    const schemas: unknown[] = [];
    const generate: BrandGenerate = async (input) => {
      schemas.push(input.responseSchema);
      if (input.responseSchema !== undefined) {
        throw new GeminiError("bad schema", 400);
      }
      return answer(`\`\`\`json\n${JSON.stringify(goodSuggestion)}\n\`\`\``);
    };
    const result = await analyzeBrand(options({ generate }));
    assert.equal(result.source, "ai");
    assert.equal(schemas.length, 2);
    assert.equal(schemas[1], undefined);
  });

  it("falls back on invalid JSON, a missing color or a network error", async () => {
    for (const generate of [
      (async () => answer("not json")) as BrandGenerate,
      (async () => answer({ font: "serif" })) as BrandGenerate,
      (async () => {
        throw new GeminiError("down", 0);
      }) as BrandGenerate,
    ]) {
      const result = await analyzeBrand(options({ generate }));
      assert.equal(result.source, "palette");
      assert.equal(result.reason, "error");
    }
  });

  it("stops calling the AI after the per-IP limit", async () => {
    let calls = 0;
    const generate: BrandGenerate = async () => {
      calls += 1;
      return answer(goodSuggestion);
    };
    const rate = { window: createRateWindow(), key: "ip", ipLimit: 2, dailyLimit: 30 };
    const results = [];
    for (let index = 0; index < 3; index += 1) {
      results.push(await analyzeBrand(options({ generate, rate })));
    }
    assert.deepEqual(results.map((item) => item.reason), ["none", "none", "quota"]);
    assert.equal(calls, 2);
  });

  it("stops calling the AI after the daily limit across IPs and resets next day", async () => {
    const generate: BrandGenerate = async () => answer(goodSuggestion);
    const window = createRateWindow(1_000);
    const first = await analyzeBrand(
      options({ generate, now: 1_000, rate: { window, key: "a", ipLimit: 9, dailyLimit: 1 } }),
    );
    const second = await analyzeBrand(
      options({ generate, now: 2_000, rate: { window, key: "b", ipLimit: 9, dailyLimit: 1 } }),
    );
    const later = await analyzeBrand(
      options({
        generate,
        now: 1_000 + 25 * 60 * 60 * 1000,
        rate: { window, key: "b", ipLimit: 9, dailyLimit: 1 },
      }),
    );
    assert.deepEqual([first.reason, second.reason, later.reason], ["none", "quota", "none"]);
  });

  it("does not count a request that was refused before reaching Gemini", async () => {
    const window = createRateWindow();
    await analyzeBrand(options({ consent: false, rate: { window, key: "ip", ipLimit: 1, dailyLimit: 1 } }));
    const generate: BrandGenerate = async () => answer(goodSuggestion);
    const result = await analyzeBrand(
      options({ generate, rate: { window, key: "ip", ipLimit: 1, dailyLimit: 1 } }),
    );
    assert.equal(result.reason, "none");
  });

  it("returns a default-colored theme when the palette is empty and AI is skipped", async () => {
    const result = await analyzeBrand(options({ palette: [], consent: false }));
    assert.equal(result.theme.colors.primary, "#102642");
    assert.deepEqual(result.palette, []);
  });
});
