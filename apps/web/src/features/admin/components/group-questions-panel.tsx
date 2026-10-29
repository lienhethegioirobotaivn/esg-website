"use client";

import type { Question, RequirementLevel } from "@esg/shared";
import { ChevronDown, ChevronUp, Pencil, Plus, Trash2 } from "lucide-react";

import { Button, Card, IconButton } from "@/components/ui";
import type { GroupEntry } from "@/features/survey";
import { cn } from "@/lib/cn";

interface GroupQuestionsPanelProps {
  entry: GroupEntry | null;
  canMoveGroupUp: boolean;
  canMoveGroupDown: boolean;
  onMoveGroup: (direction: -1 | 1) => void;
  onEditGroup: () => void;
  onDeleteGroup: () => void;
  onAddQuestion: () => void;
  onEditQuestion: (question: Question) => void;
  onDeleteQuestion: (question: Question) => void;
  onMoveQuestion: (questionId: string, direction: -1 | 1) => void;
}

function RequirementBadge({
  label,
  level,
}: {
  label: string;
  level: RequirementLevel;
}) {
  const isRequired = level === "required";
  return (
    <span
      className={cn(
        "rounded-md px-2 py-0.5 text-xs",
        isRequired
          ? "bg-primary-100 text-primary-800"
          : "bg-surface-muted text-muted",
      )}
    >
      {label}: {isRequired ? "bắt buộc" : "tùy chọn"}
    </span>
  );
}

export function GroupQuestionsPanel({
  entry,
  canMoveGroupUp,
  canMoveGroupDown,
  onMoveGroup,
  onEditGroup,
  onDeleteGroup,
  onAddQuestion,
  onEditQuestion,
  onDeleteQuestion,
  onMoveQuestion,
}: GroupQuestionsPanelProps) {
  if (!entry) {
    return (
      <Card className="p-8 text-center text-sm text-muted">
        Chưa có nhóm nào. Hãy thêm trụ cột, sau đó thêm nhóm câu hỏi ở khung bên
        trái.
      </Card>
    );
  }

  const { group } = entry;

  return (
    <Card>
      <div className="flex items-start justify-between gap-4 border-b border-border p-6">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-subtle">
            {entry.pillarName}
          </p>
          <h2 className="mt-1 text-xl">{group.title}</h2>
          {group.description ? (
            <p className="mt-2 text-sm text-muted">{group.description}</p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          <IconButton
            label="Chuyển nhóm lên trên"
            disabled={!canMoveGroupUp}
            onClick={() => onMoveGroup(-1)}
          >
            <ChevronUp aria-hidden className="size-4" />
          </IconButton>
          <IconButton
            label="Chuyển nhóm xuống dưới"
            disabled={!canMoveGroupDown}
            onClick={() => onMoveGroup(1)}
          >
            <ChevronDown aria-hidden className="size-4" />
          </IconButton>
          <IconButton label="Sửa nhóm" onClick={onEditGroup}>
            <Pencil aria-hidden className="size-4" />
          </IconButton>
          <IconButton label="Xóa nhóm" tone="danger" onClick={onDeleteGroup}>
            <Trash2 aria-hidden className="size-4" />
          </IconButton>
        </div>
      </div>

      <div className="space-y-3 p-6">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-muted">
            {group.questions.length} câu hỏi trong nhóm này
          </p>
          <Button
            size="sm"
            onClick={onAddQuestion}
            leadingIcon={<Plus aria-hidden className="size-4" />}
          >
            Thêm câu hỏi
          </Button>
        </div>

        {group.questions.length === 0 ? (
          <p className="rounded-card border border-dashed border-border-strong p-6 text-center text-sm text-muted">
            Nhóm này chưa có câu hỏi.
          </p>
        ) : (
          <ol className="space-y-3">
            {group.questions.map((question, index) => (
              <li
                key={question.id}
                className="rounded-card border border-border bg-surface p-4"
              >
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 shrink-0 whitespace-nowrap rounded-md bg-surface-muted px-2 py-1 text-xs font-medium text-muted">
                    Câu {index + 1}
                  </span>
                  <div className="min-w-0 flex-1 space-y-2">
                    <p className="text-sm font-medium leading-snug">
                      {question.text}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      <RequirementBadge
                        label="Mô tả"
                        level={question.descriptionRequirement}
                      />
                      <RequirementBadge
                        label="Bằng chứng"
                        level={question.evidenceRequirement}
                      />
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-0.5">
                    <IconButton
                      label="Chuyển câu hỏi lên trên"
                      disabled={index === 0}
                      onClick={() => onMoveQuestion(question.id, -1)}
                    >
                      <ChevronUp aria-hidden className="size-4" />
                    </IconButton>
                    <IconButton
                      label="Chuyển câu hỏi xuống dưới"
                      disabled={index === group.questions.length - 1}
                      onClick={() => onMoveQuestion(question.id, 1)}
                    >
                      <ChevronDown aria-hidden className="size-4" />
                    </IconButton>
                    <IconButton
                      label="Sửa câu hỏi"
                      onClick={() => onEditQuestion(question)}
                    >
                      <Pencil aria-hidden className="size-4" />
                    </IconButton>
                    <IconButton
                      label="Xóa câu hỏi"
                      tone="danger"
                      onClick={() => onDeleteQuestion(question)}
                    >
                      <Trash2 aria-hidden className="size-4" />
                    </IconButton>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </Card>
  );
}
