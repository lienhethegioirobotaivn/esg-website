"use client";

import { usePathname } from "next/navigation";
import { useCallback } from "react";

import type { Locale } from "../constants";
import {
  getLocaleFromPathname,
  localizePath,
  stripLocalePrefix,
} from "../lib/path";

export function useLocale(): Locale {
  return getLocaleFromPathname(usePathname());
}

export function useBarePathname(): string {
  return stripLocalePrefix(usePathname());
}

export function useLocalePath(): (path: string) => string {
  const locale = useLocale();
  return useCallback((path: string) => localizePath(path, locale), [locale]);
}
