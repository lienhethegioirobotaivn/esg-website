import { getAnswerFields } from "@esg/shared";
import type { DetailKind, Question } from "@esg/shared";

import { Field, Input, Textarea } from "@/components/ui";
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

const DETAIL_LABELS: Record<Exclude<DetailKind, "none">, string> = {
  note: "Ghi chú",
  reason: "Lý do không áp dụng",
  content: "Nội dung",
};

const DETAIL_PLACEHOLDERS: Record<Exclude<DetailKind, "none">, string> = {
  note: "Nguồn số liệu, phương pháp hoặc cách doanh nghiệp đang thực hiện",
  reason: "Nêu lý do câu hỏi không áp dụng với doanh nghiệp",
  content: "Nhập nội dung trả lời",
};

const IMPROVEMENT_VALUES: readonly string[] = ["no", "unknown"];

export function QuestionCard({
  question,
  number,
  draft,
  isFocused,
  actions,
  onFocus,
}: QuestionCardProps) {
  const detailId = `description-${question.id}`;
  const numberId = `number-${question.id}`;
  const evidenceInputId = `evidence-${question.id}`;
  const fields = getAnswerFields(question.inputType, draft.value);
  const showImprovement =
    draft.value !== null &&
    IMPROVEMENT_VALUES.includes(draft.value) &&
    question.improvementHint !== "";
  const hasFields =
    fields.numberInput || fields.detail !== "none" || fields.evidence;

  return (
    <article
      id={`question-${question.id}`}
      onFocusCapture={onFocus}
      onPointerDownCapture={onFocus}
      className={cn(
        "scroll-mt-20 rounded-card border bg-surface p-4",
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
            inputType={question.inputType}
            value={draft.value}
            onChange={(value) => actions.select(question.id, value)}
          />

          {showImprovement ? (
            <p className="rounded-control bg-surface-muted p-3 text-[0.8125rem] leading-relaxed text-muted">
              {question.improvementHint}
            </p>
          ) : null}

          {hasFields ? (
            <div className="space-y-4 border-t border-border pt-4">
              {fields.numberInput ? (
                <Field
                  label={
                    question.unit === ""
                      ? "Giá trị"
                      : `Giá trị (${question.unit})`
                  }
                  htmlFor={numberId}
                  required
                >
                  <Input
                    id={numberId}
                    inputMode="decimal"
                    value={draft.number}
                    onChange={(event) =>
                      actions.setNumber(question.id, event.target.value)
                    }
                    placeholder="Nhập số liệu trong kỳ báo cáo"
                  />
                </Field>
              ) : null}

              {fields.detail !== "none" ? (
                <Field
                  label={
                    fields.detailRequired
                      ? DETAIL_LABELS[fields.detail]
                      : `${DETAIL_LABELS[fields.detail]} (tùy chọn)`
                  }
                  htmlFor={detailId}
                  required={fields.detailRequired}
                >
                  <Textarea
                    id={detailId}
                    value={draft.description}
                    onChange={(event) =>
                      actions.describe(question.id, event.target.value)
                    }
                    placeholder={DETAIL_PLACEHOLDERS[fields.detail]}
                    rows={3}
                  />
                </Field>
              ) : null}

              {fields.evidence ? (
                <div className="space-y-1.5">
                  <p className="text-[0.8125rem] font-medium text-foreground">
                    Bằng chứng (tùy chọn)
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
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}
