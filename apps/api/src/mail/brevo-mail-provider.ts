import { MailSendError, type MailMessage, type MailProvider } from "./mail-provider.js";

const BREVO_ENDPOINT = "https://api.brevo.com/v3/smtp/email";
const REQUEST_TIMEOUT_MS = 10_000;

export interface BrevoOptions {
  apiKey: string;
  fromEmail: string;
  fromName: string;
  fetchImpl?: typeof fetch;
}

export class BrevoMailProvider implements MailProvider {
  private readonly fetchImpl: typeof fetch;

  constructor(private readonly options: BrevoOptions) {
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async send(message: MailMessage): Promise<void> {
    let response: Response;
    try {
      response = await this.fetchImpl(BREVO_ENDPOINT, {
        method: "POST",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          "api-key": this.options.apiKey,
        },
        body: JSON.stringify({
          sender: { name: this.options.fromName, email: this.options.fromEmail },
          to: [{ email: message.to }],
          subject: message.subject,
          textContent: message.text,
        }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : "lỗi không rõ";
      throw new MailSendError(`Không gọi được Brevo: ${reason}`, true);
    }

    if (response.ok) {
      return;
    }

    const detail = await readDetail(response);
    const retryable = response.status === 429 || response.status >= 500;
    throw new MailSendError(`Brevo trả HTTP ${response.status}${detail}`, retryable);
  }
}

async function readDetail(response: Response): Promise<string> {
  try {
    const payload: unknown = await response.json();
    if (typeof payload === "object" && payload !== null) {
      const message = (payload as Record<string, unknown>)["message"];
      if (typeof message === "string") {
        return `: ${message.slice(0, 300)}`;
      }
    }
  } catch {
    return "";
  }
  return "";
}
