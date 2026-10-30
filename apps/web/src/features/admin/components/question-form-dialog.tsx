"use client";

import { flattenIssues, questionInputSchema } from "@esg/shared";
import type { Question, QuestionInput } from "@esg/shared";
import { useId } from "react";
import type { FormEvent } from "react";

import { Field, Input, Modal, Select, Switch, Textarea } from "@/components/ui";

import { ASPECT_OPTIONS, DEFAULT_GUIDANCE } from "../constants";
import { useFormFields } from "../hooks/use-form-fields";
import { FormActions } from "./form-actions";

interface QuestionFormDialogProps {
  question: Question | null;
  groupId: string;
  onSubmit: (input: QuestionInput) => void;
  onClose: () => void;
}

interface QuestionFormValues {
  text: string;
  aspect: string;
  descriptionRequired: boolean;
  evidenceRequired: boolean;
  guidanceTitle: string;
  guidanceBody: string;
  suggestedEvidence: string;
  tip: string;
}

function toFormValues(question: Question | null): QuestionFormValues {
  if (question === null) {
    return {
      text: "",
      aspect: "system",
      descriptionRequired: true,
      evidenceRequired: false,
      guidanceTitle: DEFAULT_GUIDANCE.title,
      guidanceBody: DEFAULT_GUIDANCE.body,
      suggestedEvidence: DEFAULT_GUIDANCE.suggestedEvidence,
      tip: DEFAULT_GUIDANCE.tip,
    };
  }
  return {
    text: question.text,
    aspect: question.aspect,
    descriptionRequired: question.descriptionRequirement === "required",
    evidenceRequired: question.evidenceRequirement === "required",
    guidanceTitle: question.guidance.title,
    guidanceBody: question.guidance.body,
    suggestedEvidence: question.guidance.suggestedEvidence,
    tip: question.guidance.tip,
  };
}

export function QuestionFormDialog({
  question,
  groupId,
  onSubmit,
  onClose,
}: QuestionFormDialogProps) {
  const formId = useId();
  const { values, errors, setErrors, setValue } =
    useFormFields<QuestionFormValues>(toFormValues(question));

  const idOf = (name: string) => `${formId}-${name}`;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = questionInputSchema.safeParse({
      groupId,
      text: values.text.trim(),
      aspect: values.aspect,
      descriptionRequirement: values.descriptionRequired ? "required" : "optional",
      evidenceRequirement: values.evidenceRequired ? "required" : "optional",
      guidance: {
        title: values.guidanceTitle.trim(),
        body: values.guidanceBody.trim(),
        suggestedEvidence: values.suggestedEvidence.trim(),
        tip: values.tip.trim(),
      },
    });
    if (!result.success) {
      setErrors(flattenIssues(result.error));
      return;
    }
    onSubmit(result.data);
  }

  return (
    <Modal title={question ? "Sửa câu hỏi" : "Thêm câu hỏi"} onClose={onClose}>
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <Field
          label="Nội dung câu hỏi"
          htmlFor={idOf("text")}
          required
          error={errors.text}
        >
          <Textarea
            id={idOf("text")}
            value={values.text}
            onChange={(event) => setValue("text", event.target.value)}
            placeholder="Ví dụ: Công ty đã có chính sách bằng văn bản về sử dụng tiết kiệm nước chưa?"
            rows={2}
            aria-invalid={Boolean(errors.text)}
            aria-describedby={errors.text ? `${idOf("text")}-error` : undefined}
          />
        </Field>

        <Field
          label="Khía cạnh"
          htmlFor={idOf("aspect")}
          required
          error={errors.aspect}
        >
          <Select
            id={idOf("aspect")}
            value={values.aspect}
            onChange={(event) => setValue("aspect", event.target.value)}
            options={ASPECT_OPTIONS}
            placeholder="Chọn khía cạnh"
            aria-invalid={Boolean(errors.aspect)}
            aria-describedby={
              errors.aspect ? `${idOf("aspect")}-error` : undefined
            }
          />
        </Field>

        <div className="space-y-3">
          <Switch
            id={idOf("description-required")}
            checked={values.descriptionRequired}
            onChange={(checked) => setValue("descriptionRequired", checked)}
            label="Bắt buộc nhập mô tả"
            description="Áp dụng khi người dùng chọn “Đã thực hiện”. Tắt để cho phép bỏ trống."
          />
          <Switch
            id={idOf("evidence-required")}
            checked={values.evidenceRequired}
            onChange={(checked) => setValue("evidenceRequired", checked)}
            label="Bắt buộc có bằng chứng"
            description="Bật để yêu cầu tải lên ít nhất 1 tệp khi người dùng chọn “Đã thực hiện”."
          />
        </div>

        <div className="space-y-4 rounded-card border border-primary-100 bg-primary-50 p-4">
          <p className="text-sm font-medium text-primary-800">
            Hướng dẫn hiển thị ở cột phải
          </p>

          <Field
            label="Tiêu đề"
            htmlFor={idOf("guidance-title")}
            required
            error={errors["guidance.title"]}
          >
            <Input
              id={idOf("guidance-title")}
              value={values.guidanceTitle}
              onChange={(event) =>
                setValue("guidanceTitle", event.target.value, "guidance.title")
              }
              aria-invalid={Boolean(errors["guidance.title"])}
              aria-describedby={
                errors["guidance.title"]
                  ? `${idOf("guidance-title")}-error`
                  : undefined
              }
            />
          </Field>

          <Field
            label="Nội dung hướng dẫn"
            htmlFor={idOf("guidance-body")}
            required
            error={errors["guidance.body"]}
          >
            <Textarea
              id={idOf("guidance-body")}
              value={values.guidanceBody}
              onChange={(event) =>
                setValue("guidanceBody", event.target.value, "guidance.body")
              }
              rows={3}
              aria-invalid={Boolean(errors["guidance.body"])}
              aria-describedby={
                errors["guidance.body"]
                  ? `${idOf("guidance-body")}-error`
                  : undefined
              }
            />
          </Field>

          <Field
            label="Minh chứng gợi ý (tùy chọn)"
            htmlFor={idOf("suggested-evidence")}
          >
            <Textarea
              id={idOf("suggested-evidence")}
              value={values.suggestedEvidence}
              onChange={(event) =>
                setValue("suggestedEvidence", event.target.value)
              }
              rows={2}
            />
          </Field>

          <Field label="Lưu ý nhỏ (tùy chọn)" htmlFor={idOf("tip")}>
            <Input
              id={idOf("tip")}
              value={values.tip}
              onChange={(event) => setValue("tip", event.target.value)}
            />
          </Field>
        </div>

        <FormActions
          submitLabel={question ? "Lưu thay đổi" : "Thêm câu hỏi"}
          onCancel={onClose}
        />
      </form>
    </Modal>
  );
}
