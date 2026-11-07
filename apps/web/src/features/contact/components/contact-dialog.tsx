"use client";

import { inquirySchema } from "@esg/shared";
import type { InquiryKind } from "@esg/shared";
import { CheckCircle2, Info, Loader2, Users } from "lucide-react";
import { useState } from "react";
import type { FormEvent } from "react";

import { Button, Field, Input, Modal, Select, Textarea } from "@/components/ui";
import { headcountOptions, industryOptions } from "@/data";

import {
  HOTLINE_DISPLAY,
  HOTLINE_HREF,
  INQUIRY_COPY,
  INQUIRY_INITIAL_VALUES,
} from "../constants";
import type { InquiryFormValues } from "../constants";
import { SubmitContactError, submitInquiry } from "../services/submit-contact";

type FieldName = keyof InquiryFormValues;
type FormErrors = Partial<Record<FieldName, string>>;

interface ContactDialogProps {
  kind: InquiryKind;
  onClose: () => void;
}

function pickErrors(source: Record<string, string>): FormErrors {
  const errors: FormErrors = {};
  for (const field of Object.keys(INQUIRY_INITIAL_VALUES) as FieldName[]) {
    const message = source[field];
    if (message !== undefined) {
      errors[field] = message;
    }
  }
  return errors;
}

function describedBy(field: FieldName, errors: FormErrors): string | undefined {
  return errors[field] ? `inquiry-${field}-error` : undefined;
}

export function ContactDialog({ kind, onClose }: ContactDialogProps) {
  const copy = INQUIRY_COPY[kind];
  const [values, setValues] = useState<InquiryFormValues>(INQUIRY_INITIAL_VALUES);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  function update(field: FieldName, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    if (errors[field]) {
      setErrors((current) => ({ ...current, [field]: undefined }));
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) {
      return;
    }
    setSubmitError(null);

    const parsed = inquirySchema.safeParse({ kind, ...values });
    if (!parsed.success) {
      const next: FormErrors = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0]) as FieldName;
        if (!(key in next)) {
          next[key] = issue.message;
        }
      }
      setErrors(next);
      return;
    }

    setIsSubmitting(true);
    try {
      await submitInquiry(kind, values);
      setIsDone(true);
    } catch (error) {
      if (error instanceof SubmitContactError) {
        setErrors(pickErrors(error.fields));
        setSubmitError(error.message);
      } else {
        setSubmitError("Không gửi được yêu cầu. Vui lòng thử lại sau.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal title={copy.title} onClose={onClose}>
      {isDone ? (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <CheckCircle2 aria-hidden className="size-12 text-primary-600" />
          <h3 className="text-lg font-semibold">Đã gửi yêu cầu</h3>
          <p className="max-w-md text-sm text-muted">
            Cảm ơn bạn. Đội ngũ ESG Report Online sẽ liên hệ với bạn qua số điện
            thoại hoặc email đã cung cấp.
          </p>
          <Button className="mt-2" onClick={onClose}>
            Đóng
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div>
            <h3 className="text-xl font-bold leading-snug text-primary-800">
              {copy.heading}
            </h3>
            {copy.subheading ? (
              <p className="mt-1 text-sm text-muted">{copy.subheading}</p>
            ) : null}
          </div>

          {copy.chip ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary-300 bg-primary-100 px-3 py-1 text-[0.8125rem] font-medium text-primary-800">
              <Users aria-hidden className="size-4" />
              {copy.chip}
            </span>
          ) : null}

          {copy.notice ? (
            <div
              role="note"
              className="flex items-start gap-2.5 rounded-card bg-primary-100 px-3.5 py-2.5 text-[0.8125rem] text-primary-900"
            >
              <Info aria-hidden className="mt-0.5 size-4 shrink-0" />
              <p>{copy.notice}</p>
            </div>
          ) : null}

          <Field
            label="Tên doanh nghiệp"
            htmlFor="inquiry-name"
            required
            error={errors.name}
          >
            <Input
              id="inquiry-name"
              value={values.name}
              onChange={(event) => update("name", event.target.value)}
              placeholder="Nhập tên doanh nghiệp"
              autoComplete="organization"
              aria-invalid={Boolean(errors.name)}
              aria-describedby={describedBy("name", errors)}
            />
          </Field>

          <Field
            label="Thông tin doanh nghiệp"
            htmlFor="inquiry-description"
            error={errors.description}
          >
            {copy.descriptionMultiline ? (
              <Textarea
                id="inquiry-description"
                rows={2}
                className="min-h-16"
                value={values.description}
                onChange={(event) => update("description", event.target.value)}
                placeholder={copy.descriptionPlaceholder}
                aria-invalid={Boolean(errors.description)}
                aria-describedby={describedBy("description", errors)}
              />
            ) : (
              <Input
                id="inquiry-description"
                value={values.description}
                onChange={(event) => update("description", event.target.value)}
                placeholder={copy.descriptionPlaceholder}
                aria-invalid={Boolean(errors.description)}
                aria-describedby={describedBy("description", errors)}
              />
            )}
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Quy mô nhân sự"
              htmlFor="inquiry-headcount"
              required
              error={errors.headcount}
            >
              <Select
                id="inquiry-headcount"
                options={headcountOptions}
                placeholder="Chọn quy mô"
                value={values.headcount}
                onChange={(event) => update("headcount", event.target.value)}
                aria-invalid={Boolean(errors.headcount)}
                aria-describedby={describedBy("headcount", errors)}
              />
            </Field>
            <Field
              label="Ngành nghề"
              htmlFor="inquiry-industry"
              required
              error={errors.industry}
            >
              <Select
                id="inquiry-industry"
                options={industryOptions}
                placeholder="Chọn ngành nghề"
                value={values.industry}
                onChange={(event) => update("industry", event.target.value)}
                aria-invalid={Boolean(errors.industry)}
                aria-describedby={describedBy("industry", errors)}
              />
            </Field>
            <Field
              label="Số điện thoại"
              htmlFor="inquiry-phone"
              required
              error={errors.phone}
            >
              <Input
                id="inquiry-phone"
                type="tel"
                inputMode="tel"
                value={values.phone}
                onChange={(event) => update("phone", event.target.value)}
                placeholder="Nhập số điện thoại"
                autoComplete="tel"
                aria-invalid={Boolean(errors.phone)}
                aria-describedby={describedBy("phone", errors)}
              />
            </Field>
            <Field
              label="Email"
              htmlFor="inquiry-email"
              required
              error={errors.email}
            >
              <Input
                id="inquiry-email"
                type="email"
                value={values.email}
                onChange={(event) => update("email", event.target.value)}
                placeholder="Nhập email liên hệ"
                autoComplete="email"
                aria-invalid={Boolean(errors.email)}
                aria-describedby={describedBy("email", errors)}
              />
            </Field>
          </div>

          {submitError ? (
            <p role="alert" className="text-sm text-danger-600">
              {submitError}
            </p>
          ) : null}

          <Button
            type="submit"
            className="w-full"
            disabled={isSubmitting}
            leadingIcon={
              isSubmitting ? (
                <Loader2 aria-hidden className="size-4 animate-spin" />
              ) : null
            }
          >
            {isSubmitting ? "Đang gửi..." : copy.submitLabel}
          </Button>

          <p className="text-center text-sm text-muted">
            Hoặc liên hệ trực tiếp:{" "}
            <a
              href={HOTLINE_HREF}
              className="font-bold text-primary-800 hover:underline"
            >
              {HOTLINE_DISPLAY}
            </a>
          </p>
          <p className="text-center text-xs text-subtle">{copy.footnote}</p>
        </form>
      )}
    </Modal>
  );
}
