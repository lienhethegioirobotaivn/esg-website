export interface WindowBounds {
  start: Date;
  end: Date;
}

export function windowBounds(now: Date, windowSeconds: number): WindowBounds {
  const size = windowSeconds * 1000;
  const startMs = Math.floor(now.getTime() / size) * size;
  return { start: new Date(startMs), end: new Date(startMs + size) };
}

export function secondsUntil(target: Date, now: Date): number {
  return Math.max(1, Math.ceil((target.getTime() - now.getTime()) / 1000));
}
