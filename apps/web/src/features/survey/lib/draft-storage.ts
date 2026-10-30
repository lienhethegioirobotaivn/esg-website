import { DRAFT_VERSION, draftSnapshotSchema } from "@esg/shared";
import type { DraftContent, DraftSnapshot } from "@esg/shared";

const DRAFT_STORAGE_KEY = "esg-studio:draft";

const listeners = new Set<() => void>();

function notifyListeners(): void {
  for (const listener of listeners) {
    listener();
  }
}

export function subscribeDraft(listener: () => void): () => void {
  listeners.add(listener);
  function handleStorage(event: StorageEvent) {
    if (event.key === null || event.key === DRAFT_STORAGE_KEY) {
      listener();
    }
  }
  window.addEventListener("storage", handleStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", handleStorage);
  };
}

export function getDraftRaw(): string | null {
  try {
    return window.localStorage.getItem(DRAFT_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function getServerDraftRaw(): string | null {
  return null;
}

export function parseDraft(raw: string | null): DraftSnapshot | null {
  if (raw === null) {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    const result = draftSnapshotSchema.safeParse(parsed);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

export function saveDraft(content: DraftContent): boolean {
  const snapshot: DraftSnapshot = {
    version: DRAFT_VERSION,
    savedAt: new Date().toISOString(),
    ...content,
  };
  try {
    window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    return false;
  }
  notifyListeners();
  return true;
}
