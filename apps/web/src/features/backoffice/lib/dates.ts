const VIETNAM_OFFSET_MS = 7 * 60 * 60 * 1000;

const dateTimeFormat = new Intl.DateTimeFormat("vi-VN", {
  timeZone: "Asia/Ho_Chi_Minh",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

const dateFormat = new Intl.DateTimeFormat("vi-VN", {
  timeZone: "Asia/Ho_Chi_Minh",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

export function formatDateTime(value: string | null): string {
  return value === null || value === ""
    ? ""
    : dateTimeFormat.format(new Date(value));
}

export function formatDate(value: string | null): string {
  return value === null || value === "" ? "" : dateFormat.format(new Date(value));
}

export function toDateTimeInput(value: string | null): string {
  if (value === null) {
    return "";
  }
  return new Date(new Date(value).getTime() + VIETNAM_OFFSET_MS)
    .toISOString()
    .slice(0, 16);
}

export function fromDateTimeInput(value: string): string | null {
  return value === "" ? null : `${value}:00+07:00`;
}

export function isPast(value: string | null): boolean {
  return value !== null && new Date(value).getTime() < Date.now();
}
