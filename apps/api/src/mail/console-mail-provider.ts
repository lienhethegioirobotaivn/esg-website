import { Logger } from "@nestjs/common";

import type { MailMessage, MailProvider } from "./mail-provider.js";

export class ConsoleMailProvider implements MailProvider {
  private readonly logger = new Logger("Mail");

  send(message: MailMessage): Promise<void> {
    this.logger.warn(
      `Chưa cấu hình nhà cung cấp email, thư KHÔNG được gửi thật. Gửi tới ${message.to}\n` +
        `Tiêu đề: ${message.subject}\n${message.text}`,
    );
    return Promise.resolve();
  }
}
