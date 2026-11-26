import { describe, expect, it } from "vitest";

import { GeminiTranslator, parseGeminiResponse } from "./gemini-translator.js";
import { makeBatches } from "./translation.service.js";
import { TranslatorError, type TranslationRequest } from "./translator.js";

const request: TranslationRequest = {
  locale: "fr",
  texts: ["Xin chào", "Tạm biệt"],
  keep: ["ESG"],
  terms: [{ source: "minh chứng", target: "preuves" }],
};

function reply(text: string, finishReason = "STOP") {
  return { candidates: [{ finishReason, content: { parts: [{ text }] } }] };
}

function translator(send: typeof fetch) {
  return new GeminiTranslator({
    apiKey: "khoa-bi-mat",
    model: "gemini-3.5-flash-lite",
    baseUrl: "https://gemini.test/",
    fetch: send,
  });
}

describe("gọi Gemini", () => {
  it("gửi khóa qua header, yêu cầu JSON và ghép kết quả theo id", async () => {
    let url = "";
    let init: RequestInit | undefined;
    const send: typeof fetch = async (input, options) => {
      url = String(input);
      init = options;
      return Response.json(
        reply(JSON.stringify([{ id: 1, text: "Au revoir" }, { id: 0, text: "Bonjour" }])),
      );
    };

    expect(await translator(send).translate(request)).toEqual(["Bonjour", "Au revoir"]);
    expect(url).toBe("https://gemini.test/v1beta/models/gemini-3.5-flash-lite:generateContent");
    expect(url).not.toContain("khoa-bi-mat");
    expect(new Headers(init?.headers).get("x-goog-api-key")).toBe("khoa-bi-mat");
    const body = JSON.parse(String(init?.body));
    expect(body.generationConfig.responseFormat.text.mimeType).toBe("APPLICATION_JSON");
    expect(body.systemInstruction.parts[0].text).toContain("French");
    expect(body.systemInstruction.parts[0].text).toContain("ESG");
    expect(body.systemInstruction.parts[0].text).toContain("preuves");
    expect(JSON.parse(body.contents[0].parts[0].text)).toEqual([
      { id: 0, text: "Xin chào" },
      { id: 1, text: "Tạm biệt" },
    ]);
  });

  it("phân biệt quá hạn mức, lỗi máy chủ và lỗi mạng", async () => {
    const limited = translator(async () => new Response("{}", { status: 429 }));
    await expect(limited.translate(request)).rejects.toMatchObject({ rateLimited: true });

    const broken = translator(async () => new Response("khoa-bi-mat", { status: 500 }));
    const error = await broken.translate(request).catch((value: unknown) => value);
    expect(error).toBeInstanceOf(TranslatorError);
    expect((error as TranslatorError).message).not.toContain("khoa-bi-mat");

    const denied = translator(async () =>
      Response.json({ error: { status: "PERMISSION_DENIED", message: "chi tiết" } }, { status: 403 }),
    );
    await expect(denied.translate(request)).rejects.toMatchObject({
      message: "Gemini trả về mã 403 (PERMISSION_DENIED)",
    });

    const offline = translator(async () => {
      throw new TypeError("fetch failed");
    });
    await expect(offline.translate(request)).rejects.toMatchObject({ rateLimited: false });
  });

  it("coi câu trả lời cắt ngang hoặc sai định dạng là chưa dịch", () => {
    const complete = JSON.stringify([{ id: 0, text: "A" }]);
    expect(parseGeminiResponse(reply(complete, "MAX_TOKENS"), 2)).toEqual([null, null]);
    expect(parseGeminiResponse(reply("không phải json"), 2)).toEqual([null, null]);
    expect(parseGeminiResponse({}, 1)).toEqual([null]);
    expect(
      parseGeminiResponse(reply(JSON.stringify([{ id: 5, text: "lạ" }, { id: 1, text: "B" }])), 2),
    ).toEqual([null, "B"]);
  });
});

describe("chia lô", () => {
  it("tối đa 40 câu và khoảng 6000 ký tự, câu quá dài đi riêng", () => {
    expect(makeBatches(Array.from({ length: 90 }, (_, index) => `câu ${index}`)).map((b) => b.length)).toEqual([
      40, 40, 10,
    ]);
    const long = "a".repeat(7000);
    expect(makeBatches(["ngắn", long, "ngắn nữa"])).toEqual([["ngắn"], [long], ["ngắn nữa"]]);
    expect(makeBatches([])).toEqual([]);
  });
});
