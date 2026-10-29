"use client";

import { useMemo, useState } from "react";

import { Card } from "@/components/ui";
import { CompanyProfileForm } from "@/features/company";
import { GuidancePanel } from "@/features/guidance";

import { useSurvey } from "../hooks/use-survey";
import { useSurveyAnswers } from "../hooks/use-survey-answers";
import { countCompleted } from "../lib/progress";
import { flattenGroups } from "../lib/survey-tree";
import { GroupNavigator } from "./group-navigator";
import { GroupSection } from "./group-section";
import { GroupTabs } from "./group-tabs";
import { JourneyProgress } from "./journey-progress";

export function SurveyWorkspace() {
  const survey = useSurvey();
  const { answers, actions } = useSurveyAnswers();
  const entries = useMemo(() => flattenGroups(survey), [survey]);
  const allQuestions = useMemo(
    () => entries.flatMap((entry) => entry.group.questions),
    [entries],
  );

  const [activeGroupId, setActiveGroupId] = useState<string | null>(
    entries[0]?.group.id ?? null,
  );
  const [focusedQuestionId, setFocusedQuestionId] = useState<string | null>(
    null,
  );

  const activeIndex = entries.findIndex(
    (entry) => entry.group.id === activeGroupId,
  );
  const activeEntry = entries[activeIndex];
  const previousEntry = entries[activeIndex - 1];
  const nextEntry = entries[activeIndex + 1];

  const activeQuestionIndex = activeEntry
    ? Math.max(
        0,
        activeEntry.group.questions.findIndex(
          (question) => question.id === focusedQuestionId,
        ),
      )
    : 0;
  const activeQuestion =
    activeEntry?.group.questions[activeQuestionIndex] ?? null;

  const completedTotal = countCompleted(allQuestions, answers);

  function goToGroup(groupId: string) {
    setActiveGroupId(groupId);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_minmax(0,1fr)]">
      <aside aria-label="Thông tin doanh nghiệp">
        <CompanyProfileForm />
      </aside>

      <section aria-labelledby="survey-heading" className="min-w-0">
        <Card>
          <div className="flex items-start justify-between gap-4 px-6 pt-6 sm:px-8 sm:pt-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-subtle">
                Bộ câu hỏi ESG
              </p>
              <h2 id="survey-heading" className="mt-1 text-xl">
                Mỗi câu trả lời, một bước tiến.
              </h2>
            </div>
            <p className="shrink-0 rounded-control border border-border bg-surface-muted px-3 py-1.5 text-sm text-muted">
              <span className="font-semibold text-foreground">
                {completedTotal}
              </span>{" "}
              / {allQuestions.length} câu
            </p>
          </div>

          <div className="mt-5 px-6 sm:px-8">
            <GroupTabs
              entries={entries}
              activeGroupId={activeGroupId}
              answers={answers}
              onSelectGroup={setActiveGroupId}
            />
          </div>

          <div className="mt-4 border-t border-border px-6 py-6 sm:px-8">
            {activeEntry ? (
              <GroupSection
                position={activeIndex + 1}
                total={entries.length}
                group={activeEntry.group}
                answers={answers}
                activeQuestionId={activeQuestion?.id ?? null}
                actions={actions}
                onFocusQuestion={setFocusedQuestionId}
              />
            ) : (
              <p className="rounded-card border border-dashed border-border-strong p-8 text-center text-sm text-muted">
                Chưa có câu hỏi nào. Vui lòng thêm câu hỏi trong trang quản trị.
              </p>
            )}
          </div>

          {activeEntry ? (
            <GroupNavigator
              position={activeIndex + 1}
              total={entries.length}
              hasPrevious={previousEntry !== undefined}
              hasNext={nextEntry !== undefined}
              onPrevious={() => {
                if (previousEntry) {
                  goToGroup(previousEntry.group.id);
                }
              }}
              onNext={() => {
                if (nextEntry) {
                  goToGroup(nextEntry.group.id);
                }
              }}
            />
          ) : null}
        </Card>
      </section>

      <aside
        aria-label="Hướng dẫn và tiến độ"
        className="min-w-0 space-y-6 lg:sticky lg:top-22 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto"
      >
        <GuidancePanel
          question={activeQuestion}
          questionNumber={activeQuestionIndex + 1}
        />
        <JourneyProgress
          entries={entries}
          answers={answers}
          activeGroupId={activeGroupId}
          onSelectGroup={goToGroup}
        />
      </aside>
    </div>
  );
}
