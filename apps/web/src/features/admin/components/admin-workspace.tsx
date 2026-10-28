"use client";

import type { Pillar, Question, QuestionGroup } from "@esg/shared";
import { useMemo, useState } from "react";

import {
  flattenGroups,
  useSurvey,
  useSurveyContentActions,
} from "@/features/survey";

import { describeDeletion } from "../lib/deletion";
import type { DeleteTarget } from "../lib/deletion";
import { ConfirmDialog } from "./confirm-dialog";
import { GroupFormDialog } from "./group-form-dialog";
import { GroupQuestionsPanel } from "./group-questions-panel";
import { PillarFormDialog } from "./pillar-form-dialog";
import { QuestionFormDialog } from "./question-form-dialog";
import { StructurePanel } from "./structure-panel";

type DialogState =
  | { kind: "none" }
  | { kind: "pillar-form"; pillar: Pillar | null }
  | { kind: "group-form"; group: QuestionGroup | null; pillarId: string }
  | { kind: "question-form"; question: Question | null; groupId: string }
  | { kind: "confirm-delete"; target: DeleteTarget };

export function AdminWorkspace() {
  const survey = useSurvey();
  const actions = useSurveyContentActions();
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [dialog, setDialog] = useState<DialogState>({ kind: "none" });

  const entries = useMemo(() => flattenGroups(survey), [survey]);
  const selectedEntry =
    entries.find((entry) => entry.group.id === selectedGroupId) ??
    entries[0] ??
    null;

  const siblingGroups = selectedEntry
    ? (survey.find((pillar) => pillar.id === selectedEntry.pillarId)?.groups ??
      [])
    : [];
  const siblingIndex = selectedEntry
    ? siblingGroups.findIndex((group) => group.id === selectedEntry.group.id)
    : -1;

  function closeDialog() {
    setDialog({ kind: "none" });
  }

  function confirmDelete(target: DeleteTarget) {
    switch (target.type) {
      case "pillar":
        actions.removePillar(target.pillar.id);
        break;
      case "group":
        actions.removeGroup(target.group.id);
        break;
      case "question":
        actions.removeQuestion(target.question.id);
        break;
    }
    closeDialog();
  }

  return (
    <>
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <StructurePanel
          survey={survey}
          selectedGroupId={selectedEntry?.group.id ?? null}
          onSelectGroup={setSelectedGroupId}
          onAddPillar={() => setDialog({ kind: "pillar-form", pillar: null })}
          onEditPillar={(pillar) => setDialog({ kind: "pillar-form", pillar })}
          onDeletePillar={(pillar) =>
            setDialog({
              kind: "confirm-delete",
              target: { type: "pillar", pillar },
            })
          }
          onAddGroup={(pillarId) =>
            setDialog({ kind: "group-form", group: null, pillarId })
          }
        />

        <GroupQuestionsPanel
          entry={selectedEntry}
          canMoveGroupUp={siblingIndex > 0}
          canMoveGroupDown={
            siblingIndex >= 0 && siblingIndex < siblingGroups.length - 1
          }
          onMoveGroup={(direction) => {
            if (selectedEntry) {
              actions.moveGroup(selectedEntry.group.id, direction);
            }
          }}
          onEditGroup={() => {
            if (selectedEntry) {
              setDialog({
                kind: "group-form",
                group: selectedEntry.group,
                pillarId: selectedEntry.pillarId,
              });
            }
          }}
          onDeleteGroup={() => {
            if (selectedEntry) {
              setDialog({
                kind: "confirm-delete",
                target: { type: "group", group: selectedEntry.group },
              });
            }
          }}
          onAddQuestion={() => {
            if (selectedEntry) {
              setDialog({
                kind: "question-form",
                question: null,
                groupId: selectedEntry.group.id,
              });
            }
          }}
          onEditQuestion={(question) =>
            setDialog({
              kind: "question-form",
              question,
              groupId: question.groupId,
            })
          }
          onDeleteQuestion={(question) =>
            setDialog({
              kind: "confirm-delete",
              target: { type: "question", question },
            })
          }
          onMoveQuestion={actions.moveQuestion}
        />
      </div>

      {dialog.kind === "pillar-form" ? (
        <PillarFormDialog
          pillar={dialog.pillar}
          takenCodes={survey
            .filter((pillar) => pillar.id !== dialog.pillar?.id)
            .map((pillar) => pillar.code)}
          onSubmit={(input) => {
            if (dialog.pillar) {
              actions.updatePillar(dialog.pillar.id, input);
            } else {
              actions.addPillar(input);
            }
            closeDialog();
          }}
          onClose={closeDialog}
        />
      ) : null}

      {dialog.kind === "group-form" ? (
        <GroupFormDialog
          group={dialog.group}
          defaultPillarId={dialog.pillarId}
          pillars={survey}
          onSubmit={(input) => {
            if (dialog.group) {
              actions.updateGroup(dialog.group.id, input);
            } else {
              setSelectedGroupId(actions.addGroup(input));
            }
            closeDialog();
          }}
          onClose={closeDialog}
        />
      ) : null}

      {dialog.kind === "question-form" ? (
        <QuestionFormDialog
          question={dialog.question}
          groupId={dialog.groupId}
          onSubmit={(input) => {
            if (dialog.question) {
              actions.updateQuestion(dialog.question.id, input);
            } else {
              actions.addQuestion(input);
            }
            closeDialog();
          }}
          onClose={closeDialog}
        />
      ) : null}

      {dialog.kind === "confirm-delete" ? (
        <ConfirmDialog
          {...describeDeletion(dialog.target, survey)}
          confirmLabel="Xóa"
          onConfirm={() => confirmDelete(dialog.target)}
          onClose={closeDialog}
        />
      ) : null}
    </>
  );
}
