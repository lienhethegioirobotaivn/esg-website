"use client";

import {
  ADVISORY_NEEDS,
  ASSESSMENT_NEEDS,
  companyProfileSchema,
} from "@esg/shared";
import { Loader2, Save } from "lucide-react";
import { useState } from "react";
import type { FormEvent } from "react";

import {
  Button,
  Card,
  Field,
  Input,
  Select,
  Switch,
  Textarea,
} from "@/components/ui";
import { headcountOptions, industryOptions } from "@/data";

import { REPORT_PERIOD_OPTIONS } from "../constants";
import type { CompanyField, CompanyFormValues } from "../constants";
import { isCompanyField } from "../lib/company-values";
import { getReportCode, saveReportCode } from "../lib/report-code-storage";
import { SaveCompanyError, saveCompany } from "../services/save-company";
import { BusinessProfileSection } from "./business-profile-section";
import { CollapsibleSection } from "./collapsible-section";
import { LogoUploader } from "./logo-uploader";

type FormErrors = Partial<Record<CompanyField, string>>;

const advisoryOptions = ADVISORY_NEEDS.map((value) => ({
  value,
  label: value,
}));

const assessmentOptions = ASSESSMENT_NEEDS.map((value) => ({
  value,
  label: value,
}));

interface CompanyProfileFormProps {
  values: CompanyFormValues;
  onFieldChange: (field: CompanyField, value: string) => void;
  logo: File | null;
  onLogoChange: (file: File | null) => void;
  onSaved?: () => void;
}

export function CompanyProfileForm({
  values,
  onFieldChange,
  logo,
  onLogoChange,
  onSaved,
}: CompanyProfileFormProps) {
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSaving, setIsSaving] = useState(false);
  const [savedCode, setSavedCode] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  function updateField(field: CompanyField, value: string) {
    onFieldChange(field, value);
    setErrors((current) => ({ ...current, [field]: undefined }));
    setSavedCode(null);
    setSubmitError(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSaving) {
      return;
    }
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
      setSavedCode(null);
      setSubmitError(null);
      return;
    }

    setErrors({});
    setSavedCode(null);
    setSubmitError(null);
    setIsSaving(true);
    try {
      const saved = await saveCompany({
        values,
        logo,
        reportCode: getReportCode(),
      });
      saveReportCode(saved.reportCode);
      onSaved?.();
      setSavedCode(saved.reportCode);
    } catch (error) {
      if (error instanceof SaveCompanyError) {
        setErrors(error.fields);
        setSubmitError(error.message);
      } else {
        setSubmitError("Không lưu được thông tin doanh nghiệp.");
      }
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Card>
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-base">Thông tin doanh nghiệp</h2>
      </div>

      <form
        onSubmit={handleSubmit}
        noValidate
        className="max-h-[75vh] space-y-4 overflow-y-auto p-4"
      >
        <p className="text-[0.8125rem] leading-relaxed text-muted">
          Các mục có dấu * là bắt buộc.
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

        <LogoUploader file={logo} onChange={onLogoChange} />

        <Field
          label="Mã số thuế (không bắt buộc)"
          htmlFor="company-tax-code"
          error={errors.taxCode}
        >
          <Input
            id="company-tax-code"
            value={values.taxCode}
            onChange={(event) => updateField("taxCode", event.target.value)}
            placeholder="Mã số thuế hoặc mã số doanh nghiệp"
            aria-invalid={Boolean(errors.taxCode)}
            aria-describedby={
              errors.taxCode ? "company-tax-code-error" : undefined
            }
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
            <Input
              id="company-report-year"
              type="number"
              inputMode="numeric"
              min={2000}
              max={2100}
              value={values.reportYear}
              onChange={(event) =>
                updateField("reportYear", event.target.value)
              }
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
            placeholder="Ví dụ: Toàn công ty, hoặc riêng văn phòng TP.HCM"
            rows={3}
          />
        </Field>

        <BusinessProfileSection
          values={values}
          errors={errors}
          onFieldChange={updateField}
        />

        <CollapsibleSection title="Thông tin liên hệ">
          <Field
            label="Người liên hệ"
            htmlFor="company-contact-name"
            error={errors.contactName}
          >
            <Input
              id="company-contact-name"
              value={values.contactName}
              onChange={(event) =>
                updateField("contactName", event.target.value)
              }
              placeholder="Họ tên người phụ trách báo cáo"
              aria-invalid={Boolean(errors.contactName)}
              aria-describedby={
                errors.contactName ? "company-contact-name-error" : undefined
              }
            />
          </Field>

          <Field label="Email" htmlFor="company-email" error={errors.email}>
            <Input
              id="company-email"
              type="email"
              inputMode="email"
              value={values.email}
              onChange={(event) => updateField("email", event.target.value)}
              placeholder="ten@congty.vn"
              aria-invalid={Boolean(errors.email)}
              aria-describedby={
                errors.email ? "company-email-error" : undefined
              }
            />
          </Field>

          <Field
            label="Số điện thoại"
            htmlFor="company-phone"
            error={errors.phone}
          >
            <Input
              id="company-phone"
              type="tel"
              inputMode="tel"
              value={values.phone}
              onChange={(event) => updateField("phone", event.target.value)}
              placeholder="Số điện thoại liên hệ"
              aria-invalid={Boolean(errors.phone)}
              aria-describedby={
                errors.phone ? "company-phone-error" : undefined
              }
            />
          </Field>
        </CollapsibleSection>

        <CollapsibleSection title="Nhu cầu và chia sẻ dữ liệu">
          <Field
            label="Nhu cầu tư vấn"
            htmlFor="company-advisory-need"
            error={errors.advisoryNeed}
          >
            <Select
              id="company-advisory-need"
              value={values.advisoryNeed}
              onChange={(event) =>
                updateField("advisoryNeed", event.target.value)
              }
              options={advisoryOptions}
              placeholder="Chọn thông tin"
              className={values.advisoryNeed === "" ? "text-subtle" : undefined}
            />
          </Field>

          <Field
            label="Nhu cầu thẩm định"
            htmlFor="company-assessment-need"
            error={errors.assessmentNeed}
          >
            <Select
              id="company-assessment-need"
              value={values.assessmentNeed}
              onChange={(event) =>
                updateField("assessmentNeed", event.target.value)
              }
              options={assessmentOptions}
              placeholder="Chọn thông tin"
              className={
                values.assessmentNeed === "" ? "text-subtle" : undefined
              }
            />
          </Field>

          <Switch
            id="company-consent-b2b"
            checked={values.consentB2B === "yes"}
            onChange={(checked) =>
              updateField("consentB2B", checked ? "yes" : "")
            }
            label="Đồng ý được liên hệ về nhu cầu kết nối đối tác"
          />

          <Switch
            id="company-consent-data"
            checked={values.consentData === "yes"}
            onChange={(checked) =>
              updateField("consentData", checked ? "yes" : "")
            }
            label="Đồng ý cho dùng dữ liệu đã tổng hợp, ẩn danh để nghiên cứu thị trường"
          />

          <p className="text-xs leading-relaxed text-subtle">
            Hai lựa chọn trên không bắt buộc và không ảnh hưởng việc tạo báo
            cáo. Mặc định là không đồng ý. Bạn có thể rút lại bất cứ lúc nào
            bằng cách liên hệ ban quản trị.
          </p>
        </CollapsibleSection>

        <Button
          type="submit"
          variant="secondary"
          className="w-full"
          disabled={isSaving}
          leadingIcon={
            isSaving ? (
              <Loader2 aria-hidden className="size-4 animate-spin" />
            ) : (
              <Save aria-hidden className="size-4" />
            )
          }
        >
          {isSaving ? "Đang lưu..." : "Lưu thông tin doanh nghiệp"}
        </Button>

        {savedCode !== null ? (
          <p role="status" className="text-xs text-primary-700">
            Đã lưu thông tin doanh nghiệp. Mã báo cáo của bạn: {savedCode}.
          </p>
        ) : null}

        {submitError !== null ? (
          <p role="alert" className="text-xs text-danger-600">
            {submitError}
          </p>
        ) : null}
      </form>
    </Card>
  );
}
