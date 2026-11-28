"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

export const PAGE_SIZE = 20;

export interface QueryState {
  get: (key: string) => string;
  set: (patch: Record<string, string>) => void;
  clear: () => void;
  page: number;
  offset: number;
  active: boolean;
}

export function useQueryState(): QueryState {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const page = Math.max(1, Math.floor(Number(params.get("page") ?? "1")) || 1);

  function go(next: URLSearchParams) {
    const text = next.toString();
    router.replace(text === "" ? pathname : `${pathname}?${text}`, {
      scroll: false,
    });
  }

  return {
    get: (key) => params.get(key) ?? "",
    set: (patch) => {
      const next = new URLSearchParams(params.toString());
      if (!("page" in patch)) {
        next.delete("page");
      }
      for (const [key, value] of Object.entries(patch)) {
        if (value === "" || (key === "page" && value === "1")) {
          next.delete(key);
        } else {
          next.set(key, value);
        }
      }
      go(next);
    },
    clear: () => go(new URLSearchParams()),
    page,
    offset: (page - 1) * PAGE_SIZE,
    active: [...params.keys()].some((key) => key !== "page"),
  };
}
