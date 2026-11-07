"use client";

import { useCallback, useSyncExternalStore } from "react";

import type { PostSection } from "../types";

const listeners = new Set<() => void>();
const counts = new Map<string, number>();

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

function notify(): void {
  listeners.forEach((listener) => listener());
}

function readLiked(slug: string): boolean {
  try {
    return window.localStorage.getItem(storageKey(slug)) === "1";
  } catch {
    return false;
  }
}

function writeLiked(slug: string, liked: boolean): void {
  try {
    if (liked) {
      window.localStorage.setItem(storageKey(slug), "1");
    } else {
      window.localStorage.removeItem(storageKey(slug));
    }
  } catch {
    return;
  }
}

function readLikesFromResponse(payload: unknown): number | null {
  if (typeof payload !== "object" || payload === null) {
    return null;
  }
  const likes = (payload as Record<string, unknown>)["likes"];
  return typeof likes === "number" ? likes : null;
}

export function useLikes(
  section: PostSection,
  slug: string,
  serverLikes: number,
): { liked: boolean; count: number; toggle: () => void } {
  const key = `${section}:${slug}`;
  const liked = useSyncExternalStore(
    subscribe,
    () => readLiked(slug),
    () => false,
  );
  const count = useSyncExternalStore(
    subscribe,
    () => counts.get(key) ?? serverLikes,
    () => serverLikes,
  );

  const toggle = useCallback(() => {
    const nextLiked = !readLiked(slug);
    const delta = nextLiked ? 1 : -1;
    writeLiked(slug, nextLiked);
    counts.set(key, Math.max(0, (counts.get(key) ?? serverLikes) + delta));
    notify();

    void fetch("/api/likes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ section, slug, delta }),
    })
      .then(async (response) => {
        if (!response.ok) {
          return;
        }
        const likes = readLikesFromResponse(await response.json());
        if (likes !== null) {
          counts.set(key, likes);
          notify();
        }
      })
      .catch(() => undefined);
  }, [key, section, serverLikes, slug]);

  return { liked, count: liked ? Math.max(count, 1) : count, toggle };
}
