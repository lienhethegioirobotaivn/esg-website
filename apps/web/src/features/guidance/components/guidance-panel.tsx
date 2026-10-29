import type { Question } from "@esg/shared";
import { BookOpen, FolderOpen, Lightbulb, Sprout } from "lucide-react";

interface GuidancePanelProps {
  question: Question | null;
  questionNumber: number;
}

export function GuidancePanel({
  question,
  questionNumber,
}: GuidancePanelProps) {
  return (
    <section
      aria-labelledby="guidance-heading"
      className="rounded-card border border-primary-100 bg-primary-50 p-6"
    >
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary-700">
        <BookOpen aria-hidden className="size-4" />
        Một chút hướng dẫn
      </p>

      {question ? (
        <>
          <div className="mt-6 flex size-16 mx-auto items-center justify-center rounded-full bg-primary-100 text-primary-600">
            <Sprout aria-hidden className="size-9" />
          </div>

          <p className="mt-6 text-sm text-center font-bold uppercase tracking-wider text-primary-600">
            Câu {questionNumber}
          </p>
          <h2
            id="guidance-heading"
            className="mt-1 text-xl text-center text-primary-900"
          >
            {question.guidance.title}
          </h2>
          <p className="mt-3 text-sm text-justify leading-relaxed text-muted">
            {question.guidance.body}
          </p>

          {question.guidance.suggestedEvidence ? (
            <div className="mt-5 border-t border-primary-200 pt-5">
              <p className="flex items-center gap-2 text-sm font-medium text-primary-800">
                <FolderOpen aria-hidden className="size-4" />
                Minh chứng gợi ý
              </p>
              <p className="mt-2 text-[0.8125rem] text-justify leading-relaxed text-muted">
                {question.guidance.suggestedEvidence}
              </p>
            </div>
          ) : null}

          {question.guidance.tip ? (
            <div className="mt-5 flex items-start gap-2 border-t border-primary-200 pt-4 text-xs leading-relaxed text-muted">
              <Lightbulb
                aria-hidden
                className="mt-0.5 size-3.5 shrink-0 text-primary-600"
              />
              <p>{question.guidance.tip}</p>
            </div>
          ) : null}
        </>
      ) : (
        <>
          <h2 id="guidance-heading" className="mt-6 text-xl text-primary-900">
            Chưa có câu hỏi nào.
          </h2>
          <p className="mt-3 text-sm text-muted">
            Hướng dẫn của từng câu sẽ hiển thị ở đây.
          </p>
        </>
      )}
    </section>
  );
}
