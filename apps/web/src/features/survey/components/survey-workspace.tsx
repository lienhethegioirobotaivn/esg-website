"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type { ReactNode } from "react";

import { Card } from "@/components/ui";
import { COMPANY_FIELD_IDS, CompanyProfileForm } from "@/features/company";
import type { CompanyField, CompanyFormValues } from "@/features/company";
import { GuidancePanel } from "@/features/guidance";
import { LeaveDialog, useLeaveGuard } from "@/features/leave-guard";

import { useSurvey } from "../hooks/use-survey";
import { useReportExport } from "../hooks/use-report-export";
import { useReportPreview } from "../hooks/use-report-preview";
import { useSurveyAnswers } from "../hooks/use-survey-answers";
import { useSurveyDraft } from "../hooks/use-survey-draft";
import { useSurveyNavigation } from "../hooks/use-survey-navigation";
import { clearDraft, getDraftRaw, parseDraft } from "../lib/draft-storage";
import { restoreDraft } from "../lib/draft-state";
import { countCompleted } from "../lib/progress";
import type { QuestionIssue } from "../lib/report-validation";
import { flattenGroups } from "../lib/survey-tree";
import { DraftBar } from "./draft-bar";
import { DraftRestoredNotice } from "./draft-restored-notice";
import { ExportIssuesDialog } from "./export-issues-dialog";
import { GroupNavigator } from "./group-navigator";
import { GroupSection } from "./group-section";
import { JourneyProgress } from "./journey-progress";
import { PillarTabs } from "./pillar-tabs";
import { ReportActions } from "./report-actions";
import { ReportPreviewDialog } from "./report-preview-dialog";
import { ResetReportDialog } from "./reset-report-dialog";

type JumpTarget =
  | { kind: "question"; id: string }
  | { kind: "company"; field: CompanyField };

function subscribeNothing(): () => void {
  return () => undefined;
}

interface SurveyWorkspaceProps {
  intro: ReactNode;
}

function Hero({ intro, actions }: { intro: ReactNode; actions: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between md:gap-8">
      <div className="min-w-0 md:flex-1">{intro}</div>
      {actions}
    </div>
  );
}

export function SurveyWorkspace({ intro }: SurveyWorkspaceProps) {
  const isClient = useSyncExternalStore(
    subscribeNothing,
    () => true,
    () => false,
  );
  const [resetCount, setResetCount] = useState(0);

  const handleReset = useCallback(() => {
    clearDraft();
    setResetCount((count) => count + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  if (!isClient) {
    return (
      <>
        <Hero
          intro={intro}
          actions={
            <ReportActions
              onPreview={() => undefined}
              onExport={() => undefined}
              isPreviewLoading={false}
              isExporting={false}
              error={null}
              disabled
            />
          }
        />
        <div
          aria-busy
          className="h-96 animate-pulse rounded-card border border-border bg-surface-muted"
        />
      </>
    );
  }
  return (
    <LoadedSurveyWorkspace
      key={resetCount}
      intro={intro}
      onReset={handleReset}
    />
  );
}

function LoadedSurveyWorkspace({
  intro,
  onReset,
}: SurveyWorkspaceProps & { onReset: () => void }) {
  const survey = useSurvey();
  const entries = useMemo(() => flattenGroups(survey), [survey]);
  const allQuestions = useMemo(
    () => entries.flatMap((entry) => entry.group.questions),
    [entries],
  );

  const [initial] = useState(() =>
    restoreDraft(parseDraft(getDraftRaw()), entries),
  );
  const [isNoticeVisible, setIsNoticeVisible] = useState(
    initial.savedAt !== null,
  );
  const [company, setCompany] = useState<CompanyFormValues>(initial.company);
  const { answers, actions } = useSurveyAnswers(initial.answers);

  const {
    index: activeIndex,
    entry: activeEntry,
    previous: previousEntry,
    next: nextEntry,
    selectGroup,
    selectPillar,
  } = useSurveyNavigation(entries, initial.activeGroupId);

  const draft = useSurveyDraft({
    entries,
    answers,
    company,
    activeGroupId: activeEntry?.group.id ?? null,
  });

  useLeaveGuard({
    hasUnsavedChanges: draft.isDirty,
    hasEvidence: draft.hasEvidence,
    onSave: draft.persist,
  });

  const reportExport = useReportExport({ company, entries, answers });
  const reportPreview = useReportPreview({ company, entries, answers });
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [jumpTarget, setJumpTarget] = useState<JumpTarget | null>(null);

  const sectionRef = useRef<HTMLElement>(null);
  const [focusedQuestionId, setFocusedQuestionId] = useState<string | null>(
    null,
  );

  const activePillarId = activeEntry?.pillarId ?? null;
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

  function updateCompany(field: CompanyField, value: string) {
    setCompany((current) => ({ ...current, [field]: value }));
  }

  function jumpToQuestion(issue: QuestionIssue) {
    reportExport.closeValidation();
    selectGroup(issue.groupId);
    setFocusedQuestionId(issue.questionId);
    setJumpTarget({ kind: "question", id: issue.questionId });
  }

  function jumpToCompany(field: CompanyField) {
    reportExport.closeValidation();
    setJumpTarget({ kind: "company", field });
  }

  useEffect(() => {
    if (jumpTarget === null) {
      return;
    }
    const target = document.getElementById(
      jumpTarget.kind === "question"
        ? `question-${jumpTarget.id}`
        : COMPANY_FIELD_IDS[jumpTarget.field],
    );
    if (!target) {
      return;
    }
    target.scrollIntoView({ behavior: "smooth", block: "center" });
    const focusable =
      jumpTarget.kind === "question"
        ? target.querySelector<HTMLElement>("input, textarea, select, button")
        : target;
    focusable?.focus({ preventScroll: true });
  }, [jumpTarget]);

  function goToGroup(groupId: string) {
    selectGroup(groupId);
    sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <>
      <Hero
        intro={intro}
        actions={
          <ReportActions
            onPreview={() => void reportPreview.openPreview()}
            onExport={() => void reportExport.exportReport()}
            isPreviewLoading={reportPreview.isLoading}
            isExporting={reportExport.isExporting}
            error={reportExport.error ?? reportPreview.error}
          />
        }
      />
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_minmax(0,1fr)]">
        <aside aria-label="Thông tin doanh nghiệp" className="min-w-0">
          <CompanyProfileForm values={company} onFieldChange={updateCompany} />
        </aside>

        <section
          ref={sectionRef}
          aria-labelledby="survey-heading"
          className="min-w-0 scroll-mt-20"
        >
          <Card>
            <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-3">
              <h2 id="survey-heading" className="text-base">
                Bộ câu hỏi đánh giá ESG
              </h2>
              <p className="shrink-0 text-sm text-muted">
                Đã xong{" "}
                <span className="font-semibold text-foreground">
                  {completedTotal}
                </span>
                /{allQuestions.length} câu
              </p>
            </div>

            {isNoticeVisible && initial.savedAt !== null ? (
              <div className="mt-4 px-5">
                <DraftRestoredNotice
                  savedAt={initial.savedAt}
                  onDismiss={() => setIsNoticeVisible(false)}
                />
              </div>
            ) : null}

            <div className="mt-4 px-5">
              <PillarTabs
                survey={survey}
                activePillarId={activePillarId}
                answers={answers}
                onSelectPillar={selectPillar}
              />
            </div>

            <div
              id="survey-panel"
              role="tabpanel"
              aria-labelledby={
                activePillarId ? `pillar-tab-${activePillarId}` : undefined
              }
              className="px-5 py-5"
            >
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
                  Chưa có câu hỏi nào. Vui lòng thêm câu hỏi trong trang quản
                  trị.
                </p>
              )}
            </div>

            <DraftBar
              savedAt={draft.savedAt}
              isDirty={draft.isDirty}
              saveFailed={draft.saveFailed}
              onSave={draft.saveNow}
            />

            {activeEntry ? (
              <GroupNavigator
                position={activeIndex + 1}
                total={entries.length}
                hasPrevious={previousEntry !== null}
                hasNext={nextEntry !== null}
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
            activeGroupId={activeEntry?.group.id ?? null}
            onSelectGroup={goToGroup}
            onReset={() => setIsResetOpen(true)}
          />
        </aside>

        {reportExport.validation ? (
          <ExportIssuesDialog
            validation={reportExport.validation}
            onJumpToCompany={jumpToCompany}
            onJumpToQuestion={jumpToQuestion}
            onClose={reportExport.closeValidation}
          />
        ) : null}

        {reportPreview.preview ? (
          <ReportPreviewDialog
            preview={reportPreview.preview}
            onClose={reportPreview.closePreview}
          />
        ) : null}

        {isResetOpen ? (
          <ResetReportDialog
            onConfirm={onReset}
            onClose={() => setIsResetOpen(false)}
          />
        ) : null}

        <LeaveDialog />
      </div>
    </>
  );
}
