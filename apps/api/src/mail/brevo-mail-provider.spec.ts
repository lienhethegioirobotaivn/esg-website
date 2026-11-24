import { describe, expect, it, vi } from "vitest";

import { BrevoMailProvider } from "./brevo-mail-provider.js";
import { MailSendError } from "./mail-provider.js";

const message = { to: "nguoi@example.com", subject: "Tiêu đề", text: "Nội dung" };

function provider(fetchImpl: typeof fetch): BrevoMailProvider {
  return new BrevoMailProvider({
    apiKey: "khoa-thu-nghiem",
    fromEmail: "no-reply@example.com",
    fromName: "ESG Report Online",
    fetchImpl,
  });
}

function reply(status: number, body: unknown = {}): Promise<Response> {
  return Promise.resolve(new Response(JSON.stringify(body), { status }));
}

describe("BrevoMailProvider", () => {
  it("gọi đúng địa chỉ, tiêu đề api-key và nội dung", async () => {
    const fetchMock = vi.fn(() => reply(201, { messageId: "x" }));

    await provider(fetchMock as unknown as typeof fetch).send(message);

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.brevo.com/v3/smtp/email");
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>)["api-key"]).toBe("khoa-thu-nghiem");
    expect(JSON.parse(init.body as string)).toEqual({
      sender: { name: "ESG Report Online", email: "no-reply@example.com" },
      to: [{ email: "nguoi@example.com" }],
      subject: "Tiêu đề",
      textContent: "Nội dung",
    });
  });

  it("lỗi 4xx (trừ 429) là lỗi không thử lại và không lộ khóa", async () => {
    const send = provider((() => reply(401, { message: "Key not found" })) as typeof fetch).send(
      message,
    );

    await expect(send).rejects.toMatchObject({ retryable: false });
    await expect(send).rejects.toThrow("HTTP 401: Key not found");
    await expect(send).rejects.not.toThrow(/khoa-thu-nghiem/);
  });

  it("429 và 5xx là lỗi có thể thử lại", async () => {
    for (const status of [429, 500, 503]) {
      const send = provider((() => reply(status)) as typeof fetch).send(message);
      await expect(send).rejects.toMatchObject({ retryable: true });
    }
  });

  it("lỗi mạng là lỗi có thể thử lại", async () => {
    const failing = (() => Promise.reject(new Error("ECONNRESET"))) as typeof fetch;

    const send = provider(failing).send(message);

    await expect(send).rejects.toBeInstanceOf(MailSendError);
    await expect(send).rejects.toMatchObject({ retryable: true });
  });
});
