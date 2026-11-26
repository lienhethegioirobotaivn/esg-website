import { POST_TIME_ZONE_OFFSET_MINUTES } from "./posts.constants.js";

const MINUTE_MS = 60_000;

export function parsePublishDate(value: string): Date | null {
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    return null;
  }
  return new Date(date.getTime() - POST_TIME_ZONE_OFFSET_MINUTES * MINUTE_MS);
}

export function formatPublishDate(value: Date): string {
  return new Date(value.getTime() + POST_TIME_ZONE_OFFSET_MINUTES * MINUTE_MS)
    .toISOString()
    .slice(0, 10);
}
