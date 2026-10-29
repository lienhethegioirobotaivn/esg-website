"use client";

import { useEffect } from "react";

import { cn } from "@/lib/cn";

import { LOCALES, LOCALE_LABELS } from "../constants";
import { useLocaleStore } from "../store/locale-store";
import { FlagIcon } from "./flag-icon";

export function LanguageSwitcher() {
  const locale = useLocaleStore((state) => state.locale);
  const setLocale = useLocaleStore((state) => state.setLocale);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return (
    <div role="group" aria-label="Ngôn ngữ" className="flex items-center gap-1">
      {LOCALES.map((item) => {
        const isActive = item === locale;
        return (
          <button
            key={item}
            type="button"
            onClick={() => setLocale(item)}
            aria-pressed={isActive}
            aria-label={LOCALE_LABELS[item]}
            title={LOCALE_LABELS[item]}
            className="flex flex-col items-center gap-1.5 rounded-md px-1.5 py-1 transition-colors hover:bg-surface-muted"
          >
            <span
              className={cn(
                "block h-4 w-6 overflow-hidden rounded-[3px] ring-1 ring-border-strong transition-[opacity,box-shadow]",
                isActive
                  ? "ring-2 ring-primary-600 ring-offset-2"
                  : "opacity-60",
              )}
            >
              <FlagIcon locale={item} />
            </span>
            <span
              className={cn(
                "text-[0.6875rem] uppercase leading-none tracking-wide",
                isActive ? "font-semibold text-primary-700" : "text-muted",
              )}
            >
              {item}
            </span>
          </button>
        );
      })}
    </div>
  );
}
