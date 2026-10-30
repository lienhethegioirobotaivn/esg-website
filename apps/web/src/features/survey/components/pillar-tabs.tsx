import type { Survey } from "@esg/shared";

import { cn } from "@/lib/cn";

import { PILLAR_ICON_COMPONENTS } from "../constants";
import { countCompleted } from "../lib/progress";
import type { AnswerMap } from "../types";

interface PillarTabsProps {
  survey: Survey;
  activePillarId: string | null;
  answers: AnswerMap;
  onSelectPillar: (pillarId: string) => void;
}

export function PillarTabs({
  survey,
  activePillarId,
  answers,
  onSelectPillar,
}: PillarTabsProps) {
  return (
    <div
      role="tablist"
      aria-label="Phần ESG"
      className="-m-1 flex gap-2 overflow-x-auto p-1"
    >
      {survey.map((pillar) => {
        const Icon = PILLAR_ICON_COMPONENTS[pillar.icon];
        const questions = pillar.groups.flatMap((group) => group.questions);
        const isActive = pillar.id === activePillarId;
        return (
          <button
            key={pillar.id}
            id={`pillar-tab-${pillar.id}`}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-controls="survey-panel"
            disabled={pillar.groups.length === 0}
            onClick={() => onSelectPillar(pillar.id)}
            className={cn(
              "flex min-w-22 flex-1 shrink-0 flex-col items-center justify-center gap-0.5 rounded-control border px-2 py-2.5 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50 sm:flex-row sm:gap-2 sm:px-4 sm:py-3",
              isActive
                ? "border-primary-300 bg-primary-100 font-medium text-primary-900"
                : "border-border bg-surface text-muted enabled:hover:border-border-strong",
            )}
          >
            <Icon aria-hidden className="hidden size-4 shrink-0 sm:block" />
            <span className="whitespace-nowrap">{pillar.name}</span>
            <span className="text-xs text-subtle">
              {countCompleted(questions, answers)}/{questions.length}
            </span>
          </button>
        );
      })}
    </div>
  );
}
