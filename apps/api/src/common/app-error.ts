export type ErrorExtra = Readonly<Record<string, number | string>>;

export class AppError extends Error {
  readonly status: number;
  readonly code: string;
  readonly extra: ErrorExtra;

  constructor(status: number, code: string, message: string, extra: ErrorExtra = {}) {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.code = code;
    this.extra = extra;
  }
}
