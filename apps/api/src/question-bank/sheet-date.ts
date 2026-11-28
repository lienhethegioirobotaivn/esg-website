const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const LOCAL_DATE = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;

function build(year: number, month: number, day: number): string | null {
  const date = new Date(Date.UTC(year, month - 1, day));
  const valid =
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  return valid ? date.toISOString().slice(0, 10) : null;
}

export function normalizeSheetDate(value: string): string | null {
  const iso = ISO_DATE.exec(value);
  if (iso !== null) {
    return build(Number(iso[1]), Number(iso[2]), Number(iso[3]));
  }
  const local = LOCAL_DATE.exec(value);
  if (local !== null) {
    return build(Number(local[3]), Number(local[2]), Number(local[1]));
  }
  return null;
}
