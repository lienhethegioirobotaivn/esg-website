import type { Question } from "@esg/shared";

import { Card } from "@/components/ui";

interface GuidancePanelProps {
  question: Question | null;
  questionNumber: number;
}

export function GuidancePanel({
  question,
  questionNumber,
}: GuidancePanelProps) {
  return (
    <Card className="p-4">
      <h2 id="guidance-heading" className="text-base">
        Hướng dẫn
      </h2>

      {question ? (
        <div className="mt-3 space-y-3 text-sm">
          <p className="text-sm font-semibold text-subtle">
            Câu {questionNumber}
          </p>
          <h3 className="font-semibold">{question.guidance.title}</h3>
          <p className="leading-relaxed text-muted">{question.guidance.body}</p>

          {question.guidance.suggestedEvidence ? (
            <div className="border-t border-border pt-3">
              <p className="font-semibold">Minh chứng gợi ý</p>
              <p className="mt-1 text-[0.8125rem] leading-relaxed text-muted">
                {question.guidance.suggestedEvidence}
              </p>
            </div>
          ) : null}

          {question.guidance.tip ? (
            <p className="border-t border-border pt-3 text-xs leading-relaxed text-muted">
              {question.guidance.tip}
            </p>
          ) : null}
        </div>
      ) : (
        <p className="mt-3 text-sm text-muted">
          Chưa có câu hỏi nào. Hướng dẫn của từng câu sẽ hiển thị ở đây.
        </p>
      )}
    </Card>
  );
}
