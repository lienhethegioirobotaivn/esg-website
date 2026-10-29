"use client";

import { create } from "zustand";

import { DEFAULT_LOCALE } from "../constants";
import type { Locale } from "../constants";

interface LocaleState {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

export const useLocaleStore = create<LocaleState>()((set) => ({
  locale: DEFAULT_LOCALE,
  setLocale: (locale) => set({ locale }),
}));
