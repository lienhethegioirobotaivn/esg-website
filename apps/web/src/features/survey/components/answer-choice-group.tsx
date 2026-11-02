import { getAnswerChoices } from "@esg/shared";
import type { InputType } from "@esg/shared";

interface AnswerChoiceGroupProps {
  questionId: string;
  inputType: InputType;
  value: string | null;
  onChange: (value: string) => void;
}

export function AnswerChoiceGroup({
  questionId,
  inputType,
  value,
  onChange,
}: AnswerChoiceGroupProps) {
  return (
    <fieldset className="flex flex-wrap gap-x-6 gap-y-2">
      <legend className="sr-only">Câu trả lời</legend>
      {getAnswerChoices(inputType).map((choice) => (
        <label
          key={choice.value}
          className="inline-flex cursor-pointer items-center gap-2 text-sm"
        >
          <input
            type="radio"
            name={`answer-${questionId}`}
            value={choice.value}
            checked={value === choice.value}
            onChange={() => onChange(choice.value)}
            className="size-4 accent-primary-700"
          />
          {choice.label}
        </label>
      ))}
    </fieldset>
  );
}
