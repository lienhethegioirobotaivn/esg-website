import { Check } from "lucide-react";

import { Card } from "@/components/ui";
import { cn } from "@/lib/cn";
import { padNumber } from "@/lib/format";

import {
  countCompleted,
  countEvidence,
  isGroupComplete,
} from "../lib/progress";
import type { AnswerMap, GroupEntry } from "../types";

interface JourneyProgressProps {
  entries: readonly GroupEntry[];
  answers: AnswerMap;
  activeGroupId: string | null;
  onSelectGroup: (groupId: string) => void;
}

export function JourneyProgress({
  entries,
  answers,
  activeGroupId,
  onSelectGroup,
}: JourneyProgressProps) {
  const allQuestions = entries.flatMap((entry) => entry.group.questions);
  const completedQuestions = countCompleted(allQuestions, answers);
  const percent =
    allQuestions.length === 0
      ? 0
      : Math.round((completedQuestions / allQuestions.length) * 100);
  const completedGroups = entries.filter((entry) =>
    isGroupComplete(entry.group.questions, answers),
  ).length;
  const evidenceCount = countEvidence(allQuestions, answers);

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-[0.9375rem]">Hành trình của bạn</h2>
        <span className="text-sm font-semibold text-primary-700">
          {percent}%
        </span>
      </div>

      <div
        role="progressbar"
        aria-label="Tiến độ hoàn thành"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-muted"
      >
        <div
          className="h-full rounded-full bg-primary-600 transition-[width] duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>

      <p className="mt-2 flex justify-between text-xs text-subtle">
        <span>
          {completedGroups}/{entries.length} nhóm đã trả lời đầy đủ
        </span>
        <span>{evidenceCount} minh chứng</span>
      </p>

      <ul className="mt-4 space-y-1">
        {entries.map((entry, index) => {
          const questions = entry.group.questions;
          const isActive = entry.group.id === activeGroupId;
          const isComplete = isGroupComplete(questions, answers);
          return (
            <li key={entry.group.id}>
              <button
                type="button"
                onClick={() => onSelectGroup(entry.group.id)}
                aria-current={isActive ? "step" : undefined}
                className={cn(
                  "flex w-full items-center gap-3 rounded-control px-2.5 py-2 text-left text-[0.8125rem] transition-colors",
                  isActive
                    ? "bg-primary-50 font-medium text-primary-900"
                    : "text-muted hover:bg-surface-muted",
                )}
              >
                <span
                  className={cn(
                    "flex size-6 shrink-0 items-center justify-center rounded-full text-[0.6875rem] font-medium",
                    isComplete
                      ? "bg-primary-700 text-white"
                      : "border border-border bg-surface text-subtle",
                  )}
                >
                  {isComplete ? (
                    <Check aria-hidden className="size-3.5" />
                  ) : (
                    padNumber(index + 1)
                  )}
                </span>
                <span className="min-w-0 flex-1 truncate">
                  {entry.group.title}
                </span>
                <span className="shrink-0 text-xs text-subtle">
                  {countCompleted(questions, answers)}/{questions.length}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <p className="mt-4 border-t border-border pt-3 text-xs text-subtle">
        Có thể hoàn thành theo thứ tự bạn muốn.
      </p>
    </Card>
  );
}
