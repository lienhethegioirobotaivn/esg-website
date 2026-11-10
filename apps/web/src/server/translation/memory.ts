import "server-only";

import type { TargetLocale } from "@/features/locale/lib/glossary";
import { callAbout, isAboutBridgeConfigured } from "@/server/about/bridge";

const MEMORY_TTL_MS = 60_000;
const MIN_REFRESH_INTERVAL_MS = 8_000;
const RETRY_AFTER_FAILURE_MS = 30_000;
const LIST_TIMEOUT_MS = 4_000;

interface MemoryEntry {
  at: number;
  loadedAt: number;
  items: Map<string, string>;
}

const shared = globalThis as typeof globalThis & {
  __esgTranslationMemory?: Map<TargetLocale, MemoryEntry>;
};
const memory = (shared.__esgTranslationMemory ??= new Map());

function toItems(raw: unknown): Map<string, string> {
  const items = new Map<string, string>();
  if (typeof raw === "object" && raw !== null) {
    for (const [hash, text] of Object.entries(raw)) {
      if (typeof text === "string" && text !== "") {
        items.set(hash, text);
      }
    }
  }
  return items;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Hết thời gian chờ bản dịch.")), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

export async function getMemory(
  locale: TargetLocale,
  options: { refresh?: boolean } = {},
): Promise<Map<string, string>> {
  const current = memory.get(locale);
  if (!isAboutBridgeConfigured()) {
    return current?.items ?? new Map();
  }
  const now = Date.now();
  const isFresh = current !== undefined && now - current.at < MEMORY_TTL_MS;
  const canRefresh =
    current === undefined || now - current.loadedAt >= MIN_REFRESH_INTERVAL_MS;
  if (current && isFresh && !(options.refresh && canRefresh)) {
    return current.items;
  }
  try {
    const response = await withTimeout(
      callAbout("listTranslations", { locale }),
      LIST_TIMEOUT_MS,
    );
    const loaded = toItems(response["items"]);
    const items = current?.items ?? new Map<string, string>();
    for (const [hash, text] of loaded) {
      items.set(hash, text);
    }
    memory.set(locale, { at: Date.now(), loadedAt: Date.now(), items });
    return items;
  } catch (error) {
    console.error(error);
    const items = current?.items ?? new Map<string, string>();
    memory.set(locale, {
      at: Date.now() - MEMORY_TTL_MS + RETRY_AFTER_FAILURE_MS,
      loadedAt: Date.now(),
      items,
    });
    return items;
  }
}

export function rememberTranslations(
  locale: TargetLocale,
  entries: readonly { hash: string; text: string }[],
): void {
  const current = memory.get(locale);
  const items = current?.items ?? new Map<string, string>();
  for (const entry of entries) {
    items.set(entry.hash, entry.text);
  }
  memory.set(locale, {
    at: current?.at ?? Date.now(),
    loadedAt: current?.loadedAt ?? 0,
    items,
  });
}
