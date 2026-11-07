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
import { listImprovementSuggestions, selectSurvey } from "@esg/shared";
import type { ImprovementPlanInput, Survey } from "@esg/shared";

import { Card } from "@/components/ui";
import {
  COMPANY_FIELD_IDS,
  CompanyProfileForm,
  clearReportCode,
} from "@/features/company";
import type { CompanyField, CompanyFormValues } from "@/features/company";
import { FeedbackCard } from "@/features/contact";
import { GuidancePanel } from "@/features/guidance";
import { LeaveDialog, useLeaveGuard } from "@/features/leave-guard";

import { useReportExport } from "../hooks/use-report-export";
import { useReportPreview } from "../hooks/use-report-preview";
import { useSurveyAnswers } from "../hooks/use-survey-answers";
import { useSurveyDraft } from "../hooks/use-survey-draft";
import { useSurveyNavigation } from "../hooks/use-survey-navigation";
import { clearDraft, getDraftRaw, parseDraft } from "../lib/draft-storage";
import { restoreDraft } from "../lib/draft-state";
import { clearPlan, loadPlan, savePlan } from "../lib/plan-storage";
import { countCompleted } from "../lib/progress";
import type { QuestionIssue } from "../lib/report-validation";
import { flattenGroups } from "../lib/survey-tree";
import { toReportAnswers, toSurvey } from "../report/create-report";
import { DraftRestoredNotice } from "./draft-restored-notice";
import { ExportIssuesDialog } from "./export-issues-dialog";
import { GroupFooter } from "./group-footer";
import { GroupSection } from "./group-section";
import { ImprovementPlanCard } from "./improvement-plan-card";
import { JourneyProgress } from "./journey-progress";
import { PillarTabs } from "./pillar-tabs";
import { ProgressSummary } from "./progress-summary";
import { getReportDraftState } from "../lib/report-draft-state";
import type { DraftJumpTarget } from "../lib/report-draft-state";
import { ReportActions } from "./report-actions";
import { ReportDownloadDialog } from "./report-download-dialog";
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
  survey: Survey;
}

function Hero({ intro, aside }: { intro: ReactNode; aside?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between md:gap-8">
      <div className="min-w-0 md:flex-1">{intro}</div>
      {aside}
    </div>
  );
}

export function SurveyWorkspace({ intro, survey }: SurveyWorkspaceProps) {
  const isClient = useSyncExternalStore(
    subscribeNothing,
    () => true,
    () => false,
  );
  const [resetCount, setResetCount] = useState(0);

  const handleReset = useCallback(() => {
    clearDraft();
    clearReportCode();
    clearPlan();
    setResetCount((count) => count + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  if (!isClient) {
    return (
      <>
        <Hero intro={intro} />
        <div
          aria-busy
          className="h-96 animate-pulse rounded-card border border-border bg-surface-muted"
        />
        <ReportActions
          onPreview={() => undefined}
          onExport={() => undefined}
          isPreviewLoading={false}
          isExporting={false}
          error={null}
          disabled
        />
      </>
    );
  }
  return (
    <LoadedSurveyWorkspace
      key={resetCount}
      intro={intro}
      survey={survey}
      onReset={handleReset}
    />
  );
}

function LoadedSurveyWorkspace({
  intro,
  survey: fullSurvey,
  onReset,
}: SurveyWorkspaceProps & { onReset: () => void }) {
  const allEntries = useMemo(() => flattenGroups(fullSurvey), [fullSurvey]);

  const [initial] = useState(() =>
    restoreDraft(parseDraft(getDraftRaw()), allEntries),
  );
  const [isNoticeVisible, setIsNoticeVisible] = useState(
    initial.savedAt !== null,
  );
  const [company, setCompany] = useState<CompanyFormValues>(initial.company);
  const [logo, setLogo] = useState<File | null>(null);
  const [plan, setPlan] = useState<ImprovementPlanInput>(() => loadPlan());
  const survey = useMemo(
    () =>
      selectSurvey(fullSurvey, {
        industry: company.industry,
        headcount: company.headcount,
      }),
    [fullSurvey, company.industry, company.headcount],
  );
  const entries = useMemo(() => flattenGroups(survey), [survey]);
  const allQuestions = useMemo(
    () => entries.flatMap((entry) => entry.group.questions),
    [entries],
  );
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
    allEntries,
    answers,
    company,
    activeGroupId: activeEntry?.group.id ?? null,
  });

  useLeaveGuard({
    hasUnsavedChanges: draft.isDirty,
    hasEvidence: draft.hasEvidence,
    onSave: draft.persist,
  });

  const suggestions = useMemo(
    () => listImprovementSuggestions(toSurvey(entries), toReportAnswers(entries, answers)),
    [entries, answers],
  );

  function changePlan(next: ImprovementPlanInput) {
    setPlan(next);
    savePlan(next);
  }

  const reportExport = useReportExport({ company, entries, answers, logo });
  const reportPreview = useReportPreview({ company, entries, answers, logo });
  const draftState = useMemo(
    () => getReportDraftState({ company, entries, answers }),
    [company, entries, answers],
  );
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

  function jumpToDraftTarget(target: DraftJumpTarget) {
    if (target.kind === "company") {
      setJumpTarget({ kind: "company", field: target.field });
      return;
    }
    const entry = entries.find((item) =>
      item.group.questions.some(
        (question) => question.id === target.questionId,
      ),
    );
    if (entry === undefined) {
      return;
    }
    selectGroup(entry.group.id);
    setFocusedQuestionId(target.questionId);
    setJumpTarget({ kind: "question", id: target.questionId });
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
    const collapsed = target.closest("details");
    if (collapsed && !collapsed.open) {
      collapsed.open = true;
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
        aside={
          <ProgressSummary
            completed={completedTotal}
            total={allQuestions.length}
            savedAt={draft.savedAt}
            isDirty={draft.isDirty}
            saveFailed={draft.saveFailed}
          />
        }
      />
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_minmax(0,1fr)]">
        <aside aria-label="Thông tin doanh nghiệp" className="min-w-0">
          <CompanyProfileForm
            values={company}
            onFieldChange={updateCompany}
            logo={logo}
            onLogoChange={setLogo}
            onSaved={draft.persist}
          />
        </aside>

        <section
          ref={sectionRef}
          aria-labelledby="survey-heading"
          className="min-w-0 scroll-mt-20"
        >
          <Card>
            <div className="border-b border-border px-5 py-3">
              <h2 id="survey-heading" className="text-base">
                Bộ câu hỏi đánh giá ESG
              </h2>
            </div>

            {isNoticeVisible && initial.savedAt !== null ? (
              <div className="mt-4 px-5">
                <DraftRestoredNotice
                  savedAt={initial.savedAt}
                  onDismiss={() => setIsNoticeVisible(false)}
                />
              </div>
            ) : null}

            {company.industry === "" || company.headcount === "" ? (
              <p className="mt-4 px-5 text-[0.8125rem] text-muted">
                Chọn lĩnh vực hoạt động và quy mô nhân sự ở cột bên trái để xem
                đầy đủ câu hỏi phù hợp với doanh nghiệp.
              </p>
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
                  Chưa có câu hỏi phù hợp. Vui lòng chọn lĩnh vực hoạt động và
                  quy mô nhân sự để xem bộ câu hỏi.
                </p>
              )}
            </div>

            {activeEntry ? (
              <GroupFooter
                position={activeIndex + 1}
                total={entries.length}
                hasPrevious={previousEntry !== null}
                hasNext={nextEntry !== null}
                isDirty={draft.isDirty}
                saveFailed={draft.saveFailed}
                onPrevious={() => {
                  if (previousEntry) {
                    goToGroup(previousEntry.group.id);
                  }
                }}
                onSaveAndContinue={() => {
                  draft.saveNow();
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

        {reportExport.isDownloadOpen ? (
          <ReportDownloadDialog
            isDraft={draftState.isDraft}
            reasons={draftState.reasons}
            onJump={(target) => {
              reportExport.closeDownload();
              jumpToDraftTarget(target);
            }}
            exportingFormat={reportExport.exportingFormat}
            error={reportExport.error}
            onDownload={(format) => void reportExport.downloadReport(format)}
            onClose={reportExport.closeDownload}
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

      <ImprovementPlanCard plan={plan} suggestions={suggestions} onChange={changePlan} />

      <ReportActions
        onPreview={() => void reportPreview.openPreview()}
        onExport={() => void reportExport.exportReport()}
        isPreviewLoading={reportPreview.isLoading}
        isExporting={reportExport.isExporting}
        error={reportExport.error ?? reportPreview.error}
        draftState={draftState}
        onJump={jumpToDraftTarget}
      />

      <FeedbackCard />
    </>
  );
}
