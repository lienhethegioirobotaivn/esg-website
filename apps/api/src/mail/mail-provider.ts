export interface MailMessage {
  to: string;
  subject: string;
  text: string;
}

export interface MailProvider {
  send(message: MailMessage): Promise<void>;
}

export const MAIL_PROVIDER = Symbol("MAIL_PROVIDER");

export class MailSendError extends Error {
  readonly retryable: boolean;

  constructor(message: string, retryable: boolean) {
    super(message);
    this.name = "MailSendError";
    this.retryable = retryable;
  }
}
