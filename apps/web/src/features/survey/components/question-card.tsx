import type { Question, RequirementLevel } from "@esg/shared";

import { Field, Textarea } from "@/components/ui";
import { EvidenceUploader } from "@/features/evidence";
import { cn } from "@/lib/cn";

import type { SurveyAnswerActions } from "../hooks/use-survey-answers";
import type { AnswerDraft } from "../types";
import { AnswerChoiceGroup } from "./answer-choice-group";

interface QuestionCardProps {
  question: Question;
  number: number;
  draft: AnswerDraft;
  isFocused: boolean;
  actions: SurveyAnswerActions;
  onFocus: () => void;
}

function withOptionalSuffix(label: string, requirement: RequirementLevel) {
  return requirement === "optional" ? `${label} (tùy chọn)` : label;
}

export function QuestionCard({
  question,
  number,
  draft,
  isFocused,
  actions,
  onFocus,
}: QuestionCardProps) {
  const descriptionId = `description-${question.id}`;
  const evidenceInputId = `evidence-${question.id}`;

  return (
    <article
      onFocusCapture={onFocus}
      onPointerDownCapture={onFocus}
      className={cn(
        "rounded-card border bg-surface p-4",
        isFocused ? "border-primary-600" : "border-border",
      )}
    >
      <div className="flex gap-3">
        <span className="shrink-0 font-semibold text-muted">{number}.</span>

        <div className="min-w-0 flex-1 space-y-4">
          <h4 className="text-[0.9375rem] font-semibold leading-snug">
            {question.text}
          </h4>

          <AnswerChoiceGroup
            questionId={question.id}
            value={draft.value}
            onChange={(value) => actions.select(question.id, value)}
          />

          {draft.value === "implemented" ? (
            <div className="space-y-4 border-t border-border pt-4">
              <Field
                label={withOptionalSuffix("Mô tả", question.descriptionRequirement)}
                htmlFor={descriptionId}
                required={question.descriptionRequirement === "required"}
              >
                <Textarea
                  id={descriptionId}
                  value={draft.description}
                  onChange={(event) =>
                    actions.describe(question.id, event.target.value)
                  }
                  placeholder="Mô tả ngắn gọn cách doanh nghiệp đang thực hiện"
                  rows={3}
                />
              </Field>

              <div className="space-y-1.5">
                <p className="text-[0.8125rem] font-medium text-foreground">
                  {withOptionalSuffix("Bằng chứng", question.evidenceRequirement)}
                  {question.evidenceRequirement === "required" ? (
                    <span aria-hidden className="ml-1 text-primary-600">
                      *
                    </span>
                  ) : null}
                </p>
                <EvidenceUploader
                  inputId={evidenceInputId}
                  items={draft.evidence}
                  onAdd={(file) => actions.addEvidence(question.id, file)}
                  onRemove={(evidenceId) =>
                    actions.removeEvidence(question.id, evidenceId)
                  }
                />
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}
