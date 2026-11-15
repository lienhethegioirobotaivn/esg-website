const IP_WINDOW_MS = 10 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_TRACKED_IPS = 5000;

export interface RateWindow {
  readonly hits: Map<string, number[]>;
  readonly day: { start: number; count: number };
}

export function createRateWindow(now: number = Date.now()): RateWindow {
  return { hits: new Map(), day: { start: now, count: 0 } };
}

function prune(window: RateWindow, now: number): void {
  if (window.hits.size < MAX_TRACKED_IPS) {
    return;
  }
  for (const [key, times] of window.hits) {
    if (times.every((time) => now - time >= IP_WINDOW_MS)) {
      window.hits.delete(key);
    }
  }
}

export function hasIpCapacity(
  window: RateWindow,
  key: string,
  limit: number,
  now: number = Date.now(),
): boolean {
  const recent = (window.hits.get(key) ?? []).filter((time) => now - time < IP_WINDOW_MS);
  return recent.length < limit;
}

export function hasDayCapacity(
  window: RateWindow,
  limit: number,
  now: number = Date.now(),
): boolean {
  if (now - window.day.start >= DAY_MS) {
    window.day.start = now;
    window.day.count = 0;
  }
  return window.day.count < limit;
}

export function recordUse(window: RateWindow, key: string, now: number = Date.now()): void {
  prune(window, now);
  const recent = (window.hits.get(key) ?? []).filter((time) => now - time < IP_WINDOW_MS);
  recent.push(now);
  window.hits.set(key, recent);
  if (now - window.day.start >= DAY_MS) {
    window.day.start = now;
    window.day.count = 0;
  }
  window.day.count += 1;
}

const shared = createRateWindow();

export function sharedRateWindow(): RateWindow {
  return shared;
}

export function clientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || "local";
}
