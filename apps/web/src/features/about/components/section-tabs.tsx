"use client";

import { LocaleLink as Link, useBarePathname } from "@/features/locale";
import { cn } from "@/lib/cn";

import { ABOUT_PATH, SECTION_LABELS, sectionPath } from "../constants";
import type { PostSection } from "../types";

const SECTIONS: readonly PostSection[] = ["thanh-tuu", "tin-tuc"];

export function SectionTabs() {
  const pathname = useBarePathname();
  const activeSection: PostSection = pathname.startsWith(`${ABOUT_PATH}/tin-tuc`)
    ? "tin-tuc"
    : "thanh-tuu";

  return (
    <nav aria-label="Về ESG Report Online" className="border-b border-border">
      <ul className="grid grid-cols-2">
        {SECTIONS.map((section) => {
          const isActive = section === activeSection;
          return (
            <li key={section} className="text-center">
              <Link
                href={sectionPath(section)}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "-mb-px inline-block min-w-32 border-b-[3px] px-4 py-3 text-lg font-bold transition-colors",
                  isActive
                    ? "border-primary-800 text-primary-800"
                    : "border-transparent text-muted hover:text-primary-800",
                )}
              >
                {SECTION_LABELS[section]}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
