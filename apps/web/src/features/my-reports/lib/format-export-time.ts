import { HTML_LANG } from "@/features/locale";
import type { Locale } from "@/features/locale";

const TIME_PATTERN = /^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2})$/;

export function formatExportTime(time: string, locale: Locale): string {
  const match = TIME_PATTERN.exec(time);
  if (match === null) {
    return time;
  }
  const date = new Date(`${match[1]}T${match[2]}+07:00`);
  if (Number.isNaN(date.getTime())) {
    return time;
  }
  return new Intl.DateTimeFormat(HTML_LANG[locale], {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(date);
}
