import { Check } from "lucide-react";
import { Fragment } from "react";

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
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base">Tiến độ</h2>
        <span className="text-sm font-semibold">{percent}%</span>
      </div>

      <div
        role="progressbar"
        aria-label="Tiến độ hoàn thành"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        className="mt-2 h-2 overflow-hidden border border-border bg-surface-muted"
      >
        <div
          className="h-full bg-primary-600"
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
          const startsPillar = entries[index - 1]?.pillarId !== entry.pillarId;
          return (
            <Fragment key={entry.group.id}>
              {startsPillar ? (
                <li className="px-2.5 pb-1 pt-3 text-xs font-semibold text-foreground first:pt-0">
                  {entry.pillarName}
                </li>
              ) : null}
              <li>
                <button
                  type="button"
                  onClick={() => onSelectGroup(entry.group.id)}
                  aria-current={isActive ? "step" : undefined}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-control px-2.5 py-1.5 text-left text-[0.8125rem]",
                    isActive
                      ? "bg-surface-muted font-semibold text-foreground"
                      : "text-muted hover:bg-surface-muted",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-6 shrink-0 items-center justify-center rounded-control text-xs",
                      isComplete
                        ? "bg-primary-700 text-white"
                        : "border border-border-strong text-subtle",
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
            </Fragment>
          );
        })}
      </ul>

      <p className="mt-3 border-t border-border pt-3 text-xs text-subtle">
        Có thể làm các nhóm theo thứ tự bất kỳ.
      </p>
    </Card>
  );
}
