import type { Survey } from "@esg/shared";

import { cn } from "@/lib/cn";

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
      className="grid grid-cols-3 border-b border-border-strong"
    >
      {survey.map((pillar) => {
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
              "-mb-px border-b-2 px-4 py-2 text-center text-sm disabled:cursor-not-allowed disabled:opacity-50",
              isActive
                ? "border-primary-700 font-semibold text-foreground"
                : "border-transparent text-muted enabled:hover:text-foreground",
            )}
          >
            {pillar.name}{" "}
            <span className="text-xs text-subtle">
              ({countCompleted(questions, answers)}/{questions.length})
            </span>
          </button>
        );
      })}
    </div>
  );
}
