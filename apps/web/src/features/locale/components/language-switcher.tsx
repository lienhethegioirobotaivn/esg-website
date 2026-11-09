"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useLeaveGuardStore } from "@/features/leave-guard/store/leave-guard-store";
import { cn } from "@/lib/cn";

import { LOCALES, LOCALE_LABELS } from "../constants";
import type { Locale } from "../constants";
import { useBarePathname, useLocale } from "../hooks/use-locale";
import { localizePath } from "../lib/path";
import { persistLocale } from "../lib/persist-locale";
import { useT } from "../provider/i18n-provider";
import { FlagIcon } from "./flag-icon";

export function LanguageSwitcher() {
  const router = useRouter();
  const t = useT();
  const locale = useLocale();
  const barePathname = useBarePathname();
  const isGuarded = useLeaveGuardStore((state) => state.guard !== null);
  const pendingHref = useLeaveGuardStore((state) => state.pendingHref);
  const requestLeave = useLeaveGuardStore((state) => state.requestLeave);

  useEffect(() => {
    if (pendingHref === null) {
      persistLocale(locale);
    }
  }, [pendingHref, locale]);

  function switchTo(next: Locale) {
    if (next === locale) {
      return;
    }
    persistLocale(next);
    const target = localizePath(
      `${barePathname}${window.location.search}${window.location.hash}`,
      next,
    );
    if (isGuarded) {
      requestLeave(target);
      return;
    }
    router.push(target);
  }

  return (
    <div role="group" aria-label={t("Ngôn ngữ")} className="flex items-center gap-1">
      {LOCALES.map((item) => {
        const isActive = item === locale;
        return (
          <button
            key={item}
            type="button"
            onClick={() => switchTo(item)}
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
