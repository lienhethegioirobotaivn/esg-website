"use client";

import { flattenIssues, pillarInputSchema } from "@esg/shared";
import type { Pillar, PillarInput } from "@esg/shared";
import { useId } from "react";
import type { FormEvent } from "react";

import { Field, Input, Modal, Select } from "@/components/ui";

import { PILLAR_ICON_OPTIONS } from "../constants";
import { useFormFields } from "../hooks/use-form-fields";
import { FormActions } from "./form-actions";

interface PillarFormDialogProps {
  pillar: Pillar | null;
  takenCodes: readonly string[];
  onSubmit: (input: PillarInput) => void;
  onClose: () => void;
}

interface PillarFormValues {
  name: string;
  code: string;
  icon: string;
}

export function PillarFormDialog({
  pillar,
  takenCodes,
  onSubmit,
  onClose,
}: PillarFormDialogProps) {
  const formId = useId();
  const { values, errors, setErrors, setValue } =
    useFormFields<PillarFormValues>({
      name: pillar?.name ?? "",
      code: pillar?.code ?? "",
      icon: pillar?.icon ?? "sprout",
    });

  const nameId = `${formId}-name`;
  const codeId = `${formId}-code`;
  const iconId = `${formId}-icon`;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = pillarInputSchema.safeParse({
      name: values.name.trim(),
      code: values.code.trim().toUpperCase(),
      icon: values.icon,
    });
    if (!result.success) {
      setErrors(flattenIssues(result.error));
      return;
    }
    if (takenCodes.includes(result.data.code)) {
      setErrors({ code: "Mã này đã được dùng cho trụ cột khác" });
      return;
    }
    onSubmit(result.data);
  }

  return (
    <Modal title={pillar ? "Sửa trụ cột" : "Thêm trụ cột"} onClose={onClose}>
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <Field
          label="Tên trụ cột"
          htmlFor={nameId}
          required
          error={errors.name}
        >
          <Input
            id={nameId}
            value={values.name}
            onChange={(event) => setValue("name", event.target.value)}
            placeholder="Ví dụ: Môi trường"
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? `${nameId}-error` : undefined}
          />
        </Field>

        <Field
          label="Mã trụ cột (dùng làm tiền tố mã câu hỏi, tối đa 3 ký tự)"
          htmlFor={codeId}
          required
          error={errors.code}
        >
          <Input
            id={codeId}
            value={values.code}
            onChange={(event) =>
              setValue("code", event.target.value.toUpperCase())
            }
            placeholder="Ví dụ: E"
            maxLength={3}
            aria-invalid={Boolean(errors.code)}
            aria-describedby={errors.code ? `${codeId}-error` : undefined}
          />
        </Field>

        <Field label="Biểu tượng" htmlFor={iconId} required error={errors.icon}>
          <Select
            id={iconId}
            value={values.icon}
            onChange={(event) => setValue("icon", event.target.value)}
            options={PILLAR_ICON_OPTIONS}
            placeholder="Chọn biểu tượng"
          />
        </Field>

        <FormActions
          submitLabel={pillar ? "Lưu thay đổi" : "Thêm trụ cột"}
          onCancel={onClose}
        />
      </form>
    </Modal>
  );
}
