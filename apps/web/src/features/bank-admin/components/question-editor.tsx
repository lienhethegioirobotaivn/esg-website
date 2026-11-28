"use client";

import type { BankDetail, BankQuestionView, BankSource } from "@esg/shared";
import { BANK_SOURCE_LABELS } from "@esg/shared";
import { Copy, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";

import { Button, Card } from "@/components/ui";
import { Notice } from "@/features/backoffice/components/states";
import { useNotify } from "@/features/backoffice/components/toast";
import { errorMessage } from "@/features/backoffice/lib/api";

import { ofSource, shorten } from "../lib/bank";
import {
  createPayload,
  mergeForm,
  newForm,
  patchPayload,
  sameValue,
  toForm,
  type QuestionForm,
} from "../lib/question-form";
import { EvidenceSection, TestCaseSection } from "./evidence-fields";
import { ChoiceField } from "./form-controls";
import {
  AnswerSection,
  ContentSection,
  ReviewSection,
  type QuestionErrors,
} from "./question-fields";

export interface NewQuestionSeed {
  template: QuestionForm | null;
  after: string;
}

interface QuestionEditorProps {
  detail: BankDetail;
  question: BankQuestionView | null;
  source: BankSource;
  seed: NewQuestionSeed;
  readOnly: boolean;
  onDirtyChange: (dirty: boolean) => void;
  onCreate: (payload: Record<string, unknown>) => Promise<void>;
  onUpdate: (
    questionId: string,
    payload: Record<string, unknown>,
  ) => Promise<BankDetail>;
  onMove: (question: BankQuestionView, after: string) => Promise<void>;
  onDuplicate: (question: BankQuestionView, form: QuestionForm) => void;
  onDelete: (question: BankQuestionView) => void;
  onCancelNew: () => void;
}

function blankForm(detail: BankDetail, source: BankSource): QuestionForm {
  const sibling = ofSource(detail.questions, source)[0];
  return {
    ...newForm(source, null),
    capabilities: sibling?.capabilities ?? [],
  };
}

function validate(form: QuestionForm, source: BankSource): QuestionErrors {
  return {
    ...(form.text.trim() === ""
      ? { text: "Hãy nhập nội dung câu hỏi." }
      : {}),
    ...(source !== "PROFILE" && form.pillar === ""
      ? { pillar: "Hãy chọn trụ cột E, S hoặc G." }
      : {}),
  };
}

export function QuestionEditor({
  detail,
  question,
  source,
  seed,
  readOnly,
  onDirtyChange,
  onCreate,
  onUpdate,
  onMove,
  onDuplicate,
  onDelete,
  onCancelNew,
}: QuestionEditorProps) {
  const notify = useNotify();
  const [state, setState] = useState(() => {
    const initial = question
      ? toForm(question)
      : seed.template
        ? newForm(source, seed.template)
        : blankForm(detail, source);
    return { base: initial, form: initial };
  });
  const [after, setAfter] = useState(seed.after);
  const [errors, setErrors] = useState<QuestionErrors>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [moving, setMoving] = useState(false);

  const incoming = question ? toForm(question) : null;
  if (incoming && !sameValue(state.base, incoming)) {
    setState({
      base: incoming,
      form: mergeForm(state.form, state.base, incoming),
    });
  }

  const { base, form } = state;
  const changed = !sameValue(form, base);
  const dirty =
    !readOnly && (changed || (question === null && seed.template !== null));

  useEffect(() => {
    onDirtyChange(dirty);
    return () => onDirtyChange(false);
  }, [dirty, onDirtyChange]);

  const siblings = ofSource(detail.questions, source);
  const topics = [
    ...new Set(siblings.map((item) => item.topic).filter(Boolean)),
  ];
  const others = siblings.filter((item) => item.id !== question?.id);
  const index = siblings.findIndex((item) => item.id === question?.id);
  const predecessor = siblings[index - 1]?.id ?? "start";
  const positions = [
    { value: "start", label: "Đầu tab" },
    ...others.map((item) => ({
      value: item.id,
      label: `Sau ${item.code} · ${shorten(item.text, 50)}`,
    })),
    ...(question ? [] : [{ value: "end", label: "Cuối tab" }]),
  ];

  function change(patch: Partial<QuestionForm>) {
    setState((previous) => ({
      ...previous,
      form: { ...previous.form, ...patch },
    }));
    setErrors((previous) => ({
      ...previous,
      ...("text" in patch ? { text: undefined } : {}),
      ...("pillar" in patch ? { pillar: undefined } : {}),
    }));
  }

  async function save() {
    if (saving || readOnly || (question !== null && !changed)) {
      return;
    }
    const problems = validate(form, source);
    setErrors(problems);
    if (Object.keys(problems).length > 0) {
      setFailure("Còn ô bắt buộc chưa điền.");
      return;
    }
    setFailure(null);
    setSaving(true);
    try {
      if (question === null) {
        await onCreate({
          ...createPayload(form, source, newForm(source, null)),
          ...(after === "end"
            ? {}
            : { afterId: after === "start" ? null : after }),
        });
      } else {
        const next = await onUpdate(question.id, patchPayload(form, base));
        const saved = next.questions.find((item) => item.id === question.id);
        if (saved) {
          const fresh = toForm(saved);
          setState({ base: fresh, form: fresh });
        }
        notify(`Đã lưu câu ${saved?.code ?? question.code}.`);
      }
    } catch (caught) {
      setFailure(errorMessage(caught, "Không lưu được câu hỏi."));
    } finally {
      setSaving(false);
    }
  }

  async function move(value: string) {
    if (question === null || value === predecessor) {
      return;
    }
    setMoving(true);
    try {
      await onMove(question, value);
    } finally {
      setMoving(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void save();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLFormElement>) {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
      event.preventDefault();
      void save();
    }
  }

  return (
    <form
      noValidate
      className="space-y-3"
      onSubmit={handleSubmit}
      onKeyDown={handleKeyDown}
    >
      <Card className="space-y-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg">
            {question ? `Câu ${question.code}` : "Câu hỏi mới"}
            <span className="ml-2 text-sm font-normal text-muted">
              Tab {BANK_SOURCE_LABELS[source]}
            </span>
          </h2>
          {question && !readOnly ? (
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                size="sm"
                leadingIcon={<Copy aria-hidden className="size-4" />}
                onClick={() => onDuplicate(question, form)}
              >
                Nhân bản
              </Button>
              <Button
                variant="secondary"
                size="sm"
                leadingIcon={<Trash2 aria-hidden className="size-4" />}
                onClick={() => onDelete(question)}
              >
                Xóa câu
              </Button>
            </div>
          ) : null}
        </div>
        {question?.usedByReport ? (
          <Notice tone="warning">
            Báo cáo đang đọc dữ liệu theo mã câu này. Xóa, ẩn hoặc đổi loại
            trả lời có thể làm báo cáo thiếu dữ liệu.
          </Notice>
        ) : null}
        {readOnly ? null : (
          <fieldset disabled={moving || saving} className="min-w-0">
            <ChoiceField
              label="Vị trí trong tab"
              value={question ? predecessor : after}
              options={positions}
              hint={
                question
                  ? "Đổi ô này là chuyển câu ngay."
                  : "Câu mới sẽ được chèn vào vị trí này."
              }
              onChange={(value) =>
                question ? void move(value) : setAfter(value)
              }
            />
          </fieldset>
        )}
      </Card>
      <fieldset disabled={readOnly || saving} className="min-w-0 space-y-3">
        <ContentSection
          form={form}
          onChange={change}
          errors={errors}
          codeEditable={!readOnly && (question === null || question.isNew)}
          suggestedCode={question ? "" : detail.nextCodes[source]}
          topics={topics}
        />
        <AnswerSection
          form={form}
          onChange={change}
          errors={errors}
          source={source}
        />
        <ReviewSection form={form} onChange={change} />
        <EvidenceSection
          evidence={form.evidence}
          onChange={(evidence) => change({ evidence })}
        />
        <TestCaseSection
          evidence={form.evidence}
          readOnly={readOnly}
          onChange={(evidence) => change({ evidence })}
        />
      </fieldset>
      {readOnly ? null : (
        <div className="sticky bottom-0 z-10 flex flex-wrap items-center justify-end gap-3 rounded-card border border-border bg-surface p-3 shadow-lg">
          <p
            aria-live="polite"
            role={failure ? "alert" : undefined}
            className={
              failure
                ? "mr-auto text-sm text-danger-600"
                : "mr-auto text-sm text-muted"
            }
          >
            {failure ?? (dirty ? "Có thay đổi chưa lưu." : "Đã lưu.")}
          </p>
          {question === null ? (
            <Button variant="secondary" disabled={saving} onClick={onCancelNew}>
              Bỏ câu mới
            </Button>
          ) : (
            <Button
              variant="secondary"
              disabled={saving || !changed}
              onClick={() => {
                setState({ base, form: base });
                setErrors({});
                setFailure(null);
              }}
            >
              Hoàn tác
            </Button>
          )}
          <Button
            type="submit"
            loading={saving}
            disabled={question !== null && !changed}
          >
            {question === null ? "Thêm câu hỏi" : "Lưu câu hỏi"}
          </Button>
        </div>
      )}
    </form>
  );
}
