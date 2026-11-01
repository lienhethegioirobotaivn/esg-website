import type { AnswerValue } from "@esg/shared";

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
    <fieldset className="flex flex-wrap gap-x-6 gap-y-2">
      <legend className="sr-only">Câu trả lời</legend>
      {ANSWER_OPTIONS.map((option) => (
        <label
          key={option.value}
          className="inline-flex cursor-pointer items-center gap-2 text-sm"
        >
          <input
            type="radio"
            name={`answer-${questionId}`}
            value={option.value}
            checked={value === option.value}
            onChange={() => onChange(option.value)}
            className="size-4 accent-primary-700"
          />
          {option.label}
        </label>
      ))}
    </fieldset>
  );
}
