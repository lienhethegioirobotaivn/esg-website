import type { SurveyGroup } from "@esg/shared";

import { useT } from "@/features/locale";

import type { SurveyAnswerActions } from "../hooks/use-survey-answers";
import { countCompleted, getDraft } from "../lib/progress";
import type { AnswerMap } from "../types";
import { QuestionCard } from "./question-card";

interface GroupSectionProps {
  position: number;
  total: number;
  group: SurveyGroup;
  answers: AnswerMap;
  activeQuestionId: string | null;
  actions: SurveyAnswerActions;
  onFocusQuestion: (questionId: string) => void;
}

export function GroupSection({
  position,
  total,
  group,
  answers,
  activeQuestionId,
  actions,
  onFocusQuestion,
}: GroupSectionProps) {
  const t = useT();
  const completed = countCompleted(group.questions, answers);

  return (
    <div>
      <header>
        <p className="text-xs text-subtle">
          {t("Nhóm {position}/{total} · Đã xong {completed}/{count} câu", {
            position,
            total,
            completed,
            count: group.questions.length,
          })}
        </p>
        <h3 className="mt-0.5 text-lg">{group.title}</h3>
      </header>

      {group.description ? (
        <p className="mt-2 text-sm text-muted">{group.description}</p>
      ) : null}

      <div className="mt-4 space-y-3">
        {group.questions.length === 0 ? (
          <p className="rounded-card border border-dashed border-border-strong p-6 text-center text-sm text-muted">
            {t("Nhóm này chưa có câu hỏi.")}
          </p>
        ) : (
          group.questions.map((question, index) => (
            <QuestionCard
              key={question.id}
              question={question}
              number={index + 1}
              draft={getDraft(answers, question.id)}
              isFocused={activeQuestionId === question.id}
              actions={actions}
              onFocus={() => onFocusQuestion(question.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}
