"use client";

import { useEffect, useRef } from "react";

import { cn } from "@/lib/cn";
import { padNumber } from "@/lib/format";

import { PILLAR_ICON_COMPONENTS } from "../constants";
import { countCompleted } from "../lib/progress";
import type { AnswerMap, GroupEntry } from "../types";

interface GroupTabsProps {
  entries: readonly GroupEntry[];
  activeGroupId: string | null;
  answers: AnswerMap;
  onSelectGroup: (groupId: string) => void;
}

export function GroupTabs({
  entries,
  activeGroupId,
  answers,
  onSelectGroup,
}: GroupTabsProps) {
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const list = listRef.current;
    if (!list || activeGroupId === null) {
      return;
    }
    const activeTab = Array.from(list.children).find(
      (child): child is HTMLElement =>
        child instanceof HTMLElement && child.dataset.groupId === activeGroupId,
    );
    if (!activeTab) {
      return;
    }
    const left =
      activeTab.offsetLeft - (list.clientWidth - activeTab.offsetWidth) / 2;
    list.scrollTo({ left: Math.max(0, left), behavior: "smooth" });
  }, [activeGroupId]);

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label="Nhóm câu hỏi"
      className="relative -mx-1 flex gap-3 overflow-x-auto px-1 pb-2"
    >
      {entries.map((entry, index) => {
        const Icon = PILLAR_ICON_COMPONENTS[entry.pillarIcon];
        const isActive = entry.group.id === activeGroupId;
        const questions = entry.group.questions;
        return (
          <button
            key={entry.group.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            data-group-id={entry.group.id}
            title={`${entry.pillarName} · ${entry.group.title}`}
            onClick={() => onSelectGroup(entry.group.id)}
            className={cn(
              "flex shrink-0 items-center gap-2.5 whitespace-nowrap rounded-control border px-4 py-2.5 text-sm transition-colors",
              isActive
                ? "border-primary-300 bg-primary-100 font-medium text-primary-900"
                : "border-border bg-surface text-muted hover:border-border-strong",
            )}
          >
            <Icon aria-hidden className="size-4 shrink-0" />
            <span className="text-xs text-subtle">{padNumber(index + 1)}</span>
            <span className="max-w-56 truncate">{entry.group.title}</span>
            <span className="text-xs text-subtle">
              {countCompleted(questions, answers)}/{questions.length}
            </span>
          </button>
        );
      })}
    </div>
  );
}
