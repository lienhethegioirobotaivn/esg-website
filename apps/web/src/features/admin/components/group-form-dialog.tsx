"use client";

import { flattenIssues, questionGroupInputSchema } from "@esg/shared";
import type { Pillar, QuestionGroup, QuestionGroupInput } from "@esg/shared";
import { useId, useMemo } from "react";
import type { FormEvent } from "react";

import { Field, Input, Modal, Select, Textarea } from "@/components/ui";

import { useFormFields } from "../hooks/use-form-fields";
import { FormActions } from "./form-actions";

interface GroupFormDialogProps {
  group: QuestionGroup | null;
  defaultPillarId: string;
  pillars: readonly Pillar[];
  onSubmit: (input: QuestionGroupInput) => void;
  onClose: () => void;
}

interface GroupFormValues {
  pillarId: string;
  title: string;
  description: string;
}

export function GroupFormDialog({
  group,
  defaultPillarId,
  pillars,
  onSubmit,
  onClose,
}: GroupFormDialogProps) {
  const formId = useId();
  const { values, errors, setErrors, setValue } =
    useFormFields<GroupFormValues>({
      pillarId: group?.pillarId ?? defaultPillarId,
      title: group?.title ?? "",
      description: group?.description ?? "",
    });

  const pillarOptions = useMemo(
    () => pillars.map((pillar) => ({ value: pillar.id, label: pillar.name })),
    [pillars],
  );

  const pillarFieldId = `${formId}-pillar`;
  const titleId = `${formId}-title`;
  const descriptionId = `${formId}-description`;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = questionGroupInputSchema.safeParse({
      pillarId: values.pillarId,
      title: values.title.trim(),
      description: values.description.trim(),
    });
    if (!result.success) {
      setErrors(flattenIssues(result.error));
      return;
    }
    onSubmit(result.data);
  }

  return (
    <Modal
      title={group ? "Sửa nhóm câu hỏi" : "Thêm nhóm câu hỏi"}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <Field
          label="Thuộc trụ cột"
          htmlFor={pillarFieldId}
          required
          error={errors.pillarId}
        >
          <Select
            id={pillarFieldId}
            value={values.pillarId}
            onChange={(event) => setValue("pillarId", event.target.value)}
            options={pillarOptions}
            placeholder="Chọn trụ cột"
            aria-invalid={Boolean(errors.pillarId)}
          />
        </Field>

        <Field label="Tên nhóm" htmlFor={titleId} required error={errors.title}>
          <Input
            id={titleId}
            value={values.title}
            onChange={(event) => setValue("title", event.target.value)}
            placeholder="Ví dụ: Chiến lược môi trường"
            aria-invalid={Boolean(errors.title)}
            aria-describedby={errors.title ? `${titleId}-error` : undefined}
          />
        </Field>

        <Field label="Mô tả (tùy chọn)" htmlFor={descriptionId}>
          <Textarea
            id={descriptionId}
            value={values.description}
            onChange={(event) => setValue("description", event.target.value)}
            placeholder="Mô tả ngắn về nội dung của nhóm"
            rows={3}
          />
        </Field>

        <FormActions
          submitLabel={group ? "Lưu thay đổi" : "Thêm nhóm"}
          onCancel={onClose}
        />
      </form>
    </Modal>
  );
}
