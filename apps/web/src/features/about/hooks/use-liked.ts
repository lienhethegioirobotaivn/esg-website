"use client";

import { useCallback, useSyncExternalStore } from "react";

const listeners = new Set<() => void>();

function storageKey(slug: string): string {
  return `esg-studio:liked:${slug}`;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function readLiked(slug: string): boolean {
  try {
    return window.localStorage.getItem(storageKey(slug)) === "1";
  } catch {
    return false;
  }
}

export function useLiked(slug: string): [boolean, () => void] {
  const liked = useSyncExternalStore(
    subscribe,
    () => readLiked(slug),
    () => false,
  );

  const toggle = useCallback(() => {
    try {
      if (readLiked(slug)) {
        window.localStorage.removeItem(storageKey(slug));
      } else {
        window.localStorage.setItem(storageKey(slug), "1");
      }
    } catch {
      return;
    }
    listeners.forEach((listener) => listener());
  }, [slug]);

  return [liked, toggle];
}
