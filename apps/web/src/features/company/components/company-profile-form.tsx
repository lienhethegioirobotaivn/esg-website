"use client";

import { companyProfileSchema } from "@esg/shared";
import { Building2, Save } from "lucide-react";
import { useState } from "react";
import type { FormEvent } from "react";

import { Button, Card, Field, Input, Select, Textarea } from "@/components/ui";
import { headcountOptions, industryOptions } from "@/data";

import {
  REPORT_PERIOD_OPTIONS,
  REPORT_YEAR_OPTIONS,
} from "../constants";
import type { CompanyField, CompanyFormValues } from "../constants";
import { isCompanyField } from "../lib/company-values";

type FormErrors = Partial<Record<CompanyField, string>>;

interface CompanyProfileFormProps {
  values: CompanyFormValues;
  onFieldChange: (field: CompanyField, value: string) => void;
}

export function CompanyProfileForm({
  values,
  onFieldChange,
}: CompanyProfileFormProps) {
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSaved, setIsSaved] = useState(false);

  function updateField(field: CompanyField, value: string) {
    onFieldChange(field, value);
    setErrors((current) => ({ ...current, [field]: undefined }));
    setIsSaved(false);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = companyProfileSchema.safeParse({
      ...values,
      reportYear:
        values.reportYear === "" ? undefined : Number(values.reportYear),
    });

    if (!result.success) {
      const nextErrors: FormErrors = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0];
        if (key !== undefined && isCompanyField(key) && !nextErrors[key]) {
          nextErrors[key] = issue.message;
        }
      }
      setErrors(nextErrors);
      setIsSaved(false);
      return;
    }

    setErrors({});
    setIsSaved(true);
  }

  return (
    <Card>
      <div className="flex items-center gap-3 border-b border-border p-5">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-control bg-primary-50 text-primary-700">
          <Building2 aria-hidden className="size-5" />
        </span>
        <div>
          <h2 className="text-[0.9375rem]">Doanh nghiệp của bạn</h2>
          <p className="text-xs text-subtle">Thông tin dùng trong báo cáo ESG</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-4 p-5">
        <p className="text-[0.8125rem] leading-relaxed text-muted">
          Chỉ 7 thông tin để đặt báo cáo vào đúng bối cảnh doanh nghiệp.
        </p>

        <Field
          label="Tên doanh nghiệp"
          htmlFor="company-name"
          required
          error={errors.name}
        >
          <Input
            id="company-name"
            value={values.name}
            onChange={(event) => updateField("name", event.target.value)}
            placeholder="Tên đầy đủ theo đăng ký"
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? "company-name-error" : undefined}
          />
        </Field>

        <Field
          label="Lĩnh vực hoạt động"
          htmlFor="company-industry"
          required
          error={errors.industry}
        >
          <Select
            id="company-industry"
            value={values.industry}
            onChange={(event) => updateField("industry", event.target.value)}
            options={industryOptions}
            placeholder="Chọn thông tin"
            className={values.industry === "" ? "text-subtle" : undefined}
            aria-invalid={Boolean(errors.industry)}
            aria-describedby={
              errors.industry ? "company-industry-error" : undefined
            }
          />
        </Field>

        <Field
          label="Quy mô nhân sự"
          htmlFor="company-headcount"
          required
          error={errors.headcount}
        >
          <Select
            id="company-headcount"
            value={values.headcount}
            onChange={(event) => updateField("headcount", event.target.value)}
            options={headcountOptions}
            placeholder="Chọn thông tin"
            className={values.headcount === "" ? "text-subtle" : undefined}
            aria-invalid={Boolean(errors.headcount)}
            aria-describedby={
              errors.headcount ? "company-headcount-error" : undefined
            }
          />
        </Field>

        <Field
          label="Địa chỉ trụ sở"
          htmlFor="company-address"
          required
          error={errors.address}
        >
          <Textarea
            id="company-address"
            value={values.address}
            onChange={(event) => updateField("address", event.target.value)}
            placeholder="Số nhà, đường, phường / xã, tỉnh / thành phố"
            rows={3}
            aria-invalid={Boolean(errors.address)}
            aria-describedby={
              errors.address ? "company-address-error" : undefined
            }
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field
            label="Kỳ báo cáo"
            htmlFor="company-report-period"
            required
            error={errors.reportPeriod}
          >
            <Select
              id="company-report-period"
              value={values.reportPeriod}
              onChange={(event) =>
                updateField("reportPeriod", event.target.value)
              }
              options={REPORT_PERIOD_OPTIONS}
              placeholder="Chọn kỳ"
              className={values.reportPeriod === "" ? "text-subtle" : undefined}
              aria-invalid={Boolean(errors.reportPeriod)}
              aria-describedby={
                errors.reportPeriod ? "company-report-period-error" : undefined
              }
            />
          </Field>

          <Field
            label="Năm báo cáo"
            htmlFor="company-report-year"
            required
            error={errors.reportYear}
          >
            <Select
              id="company-report-year"
              value={values.reportYear}
              onChange={(event) => updateField("reportYear", event.target.value)}
              options={REPORT_YEAR_OPTIONS}
              placeholder="Chọn năm"
              className={values.reportYear === "" ? "text-subtle" : undefined}
              aria-invalid={Boolean(errors.reportYear)}
              aria-describedby={
                errors.reportYear ? "company-report-year-error" : undefined
              }
            />
          </Field>
        </div>

        <Field label="Phạm vi báo cáo ESG" htmlFor="company-report-scope">
          <Textarea
            id="company-report-scope"
            value={values.reportScope}
            onChange={(event) => updateField("reportScope", event.target.value)}
            placeholder="Pháp nhân, cơ sở và hoạt động được bao gồm"
            rows={3}
          />
        </Field>

        <Button
          type="submit"
          variant="secondary"
          className="w-full"
          leadingIcon={<Save aria-hidden className="size-4" />}
        >
          Lưu thông tin doanh nghiệp
        </Button>

        {isSaved ? (
          <p role="status" className="text-xs text-primary-700">
            Đã ghi nhận thông tin (bản demo, chưa lưu vào máy chủ).
          </p>
        ) : null}
      </form>
    </Card>
  );
}
