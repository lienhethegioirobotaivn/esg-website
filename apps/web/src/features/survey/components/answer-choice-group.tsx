import type { AnswerValue } from "@esg/shared";

import { cn } from "@/lib/cn";

import { ANSWER_OPTIONS } from "../constants";

interface AnswerChoiceGroupProps {
  questionId: string;
  value: AnswerValue | null;
  onChange: (value: AnswerValue) => void;
}

export function AnswerChoiceGroup({
  questionId,
  value,
  onChange,
}: AnswerChoiceGroupProps) {
  return (
    <fieldset className="flex flex-wrap gap-2">
      <legend className="sr-only">Câu trả lời</legend>
      {ANSWER_OPTIONS.map((option) => {
        const isSelected = value === option.value;
        return (
          <label
            key={option.value}
            className={cn(
              "inline-flex cursor-pointer items-center gap-2 rounded-control border px-3.5 py-2 text-sm transition-colors has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-primary-500",
              isSelected
                ? "border-primary-500 bg-primary-50 font-medium text-primary-800"
                : "border-border bg-surface text-muted hover:border-border-strong",
            )}
          >
            <input
              type="radio"
              name={`answer-${questionId}`}
              value={option.value}
              checked={isSelected}
              onChange={() => onChange(option.value)}
              className="sr-only"
            />
            <span
              aria-hidden
              className={cn(
                "size-3.5 shrink-0 rounded-full border",
                isSelected
                  ? "border-4 border-primary-600 bg-white"
                  : "border-border-strong",
              )}
            />
            {option.label}
          </label>
        );
      })}
    </fieldset>
  );
}
