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
  onSubmit: (input: PillarInput) => void;
  onClose: () => void;
}

interface PillarFormValues {
  name: string;
  icon: string;
}

export function PillarFormDialog({
  pillar,
  onSubmit,
  onClose,
}: PillarFormDialogProps) {
  const formId = useId();
  const { values, errors, setErrors, setValue } =
    useFormFields<PillarFormValues>({
      name: pillar?.name ?? "",
      icon: pillar?.icon ?? "sprout",
    });

  const nameId = `${formId}-name`;
  const iconId = `${formId}-icon`;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = pillarInputSchema.safeParse({
      name: values.name.trim(),
      icon: values.icon,
    });
    if (!result.success) {
      setErrors(flattenIssues(result.error));
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
