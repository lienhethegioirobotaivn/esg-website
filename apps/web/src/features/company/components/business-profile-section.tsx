"use client";

import {
  CAPABILITY_OPTIONS,
  LEGAL_FORMS,
  PRESENCE_OPTIONS,
  REVENUE_BANDS,
  joinCodes,
  splitCodes,
} from "@esg/shared";
import { ChevronDown } from "lucide-react";

import { Field, Input, Select, Textarea } from "@/components/ui";
import { industryOptions } from "@/data";

import { COMPANY_FIELD_IDS } from "../constants";
import type { CompanyField, CompanyFormValues } from "../constants";

type SectionErrors = Partial<Record<CompanyField, string>>;

interface BusinessProfileSectionProps {
  values: CompanyFormValues;
  errors: SectionErrors;
  onFieldChange: (field: CompanyField, value: string) => void;
}

interface CheckboxGroupProps {
  legend: string;
  hint?: string;
  options: readonly { value: string; label: string }[];
  selected: readonly string[];
  idPrefix: string;
  onChange: (next: string[]) => void;
}

const legalFormOptions = LEGAL_FORMS.map((value) => ({ value, label: value }));

function CheckboxGroup({
  legend,
  hint,
  options,
  selected,
  idPrefix,
  onChange,
}: CheckboxGroupProps) {
  function toggle(value: string) {
    onChange(
      selected.includes(value)
        ? selected.filter((item) => item !== value)
        : [...selected, value],
    );
  }

  return (
    <fieldset className="space-y-1.5">
      <legend className="block text-[0.8125rem] font-medium text-foreground">
        {legend}
      </legend>
      {hint ? <p className="text-xs text-subtle">{hint}</p> : null}
      <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
        {options.map((option) => {
          const id = `${idPrefix}-${option.value}`;
          return (
            <label
              key={option.value}
              htmlFor={id}
              className="flex items-center gap-2 text-sm"
            >
              <input
                id={id}
                type="checkbox"
                checked={selected.includes(option.value)}
                onChange={() => toggle(option.value)}
                className="size-4 accent-primary-600"
              />
              {option.label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

export function BusinessProfileSection({
  values,
  errors,
  onFieldChange,
}: BusinessProfileSectionProps) {
  const secondaryOptions = industryOptions.filter(
    (option) => option.value !== values.industry,
  );

  return (
    <details className="group border-t border-border pt-4">
      <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold">
        <span>
          Bối cảnh doanh nghiệp{" "}
          <span className="font-normal text-subtle">(không bắt buộc)</span>
        </span>
        <ChevronDown
          aria-hidden
          className="size-4 transition-transform group-open:rotate-180"
        />
      </summary>

      <div className="mt-4 space-y-4">
        <p className="text-xs leading-relaxed text-subtle">
          Thông tin này giúp báo cáo mô tả đúng bối cảnh hoạt động. Mục để
          trống sẽ không xuất hiện trong báo cáo.
        </p>

        <Field
          label="Tên giao dịch"
          htmlFor={COMPANY_FIELD_IDS.tradingName}
          error={errors.tradingName}
        >
          <Input
            id={COMPANY_FIELD_IDS.tradingName}
            value={values.tradingName}
            onChange={(event) => onFieldChange("tradingName", event.target.value)}
            placeholder="Có thể để trống"
          />
        </Field>

        <Field
          label="Loại hình pháp lý"
          htmlFor={COMPANY_FIELD_IDS.legalForm}
          error={errors.legalForm}
        >
          <Select
            id={COMPANY_FIELD_IDS.legalForm}
            value={values.legalForm}
            onChange={(event) => onFieldChange("legalForm", event.target.value)}
            options={legalFormOptions}
            placeholder="Chọn thông tin"
            className={values.legalForm === "" ? "text-subtle" : undefined}
          />
        </Field>

        <CheckboxGroup
          legend="Ngành bổ sung"
          hint="Chỉ chọn khi có hoạt động thực tế ngoài lĩnh vực chính."
          options={secondaryOptions}
          selected={splitCodes(values.secondarySectors)}
          idPrefix="company-secondary"
          onChange={(next) => onFieldChange("secondarySectors", joinCodes(next))}
        />

        <Field
          label="Quốc gia, vùng hoạt động"
          htmlFor={COMPANY_FIELD_IDS.countries}
          error={errors.countries}
        >
          <Input
            id={COMPANY_FIELD_IDS.countries}
            value={values.countries}
            onChange={(event) => onFieldChange("countries", event.target.value)}
            placeholder="Ví dụ: Việt Nam"
          />
        </Field>

        <Field
          label="Cơ sở trong phạm vi báo cáo"
          htmlFor={COMPANY_FIELD_IDS.sites}
          error={errors.sites}
        >
          <Textarea
            id={COMPANY_FIELD_IDS.sites}
            value={values.sites}
            onChange={(event) => onFieldChange("sites", event.target.value)}
            placeholder="Mỗi cơ sở một dòng: Tên cơ sở | Hoạt động được tính | Giới hạn"
            rows={3}
          />
        </Field>

        <Field
          label="Sản phẩm, dịch vụ chính"
          htmlFor={COMPANY_FIELD_IDS.activities}
          error={errors.activities}
        >
          <Textarea
            id={COMPANY_FIELD_IDS.activities}
            value={values.activities}
            onChange={(event) => onFieldChange("activities", event.target.value)}
            placeholder="Mô tả ngắn 1 đến 3 nhóm sản phẩm, dịch vụ"
            rows={3}
          />
        </Field>

        <CheckboxGroup
          legend="Hoạt động đặc thù"
          options={CAPABILITY_OPTIONS}
          selected={splitCodes(values.capabilities)}
          idPrefix="company-capability"
          onChange={(next) => onFieldChange("capabilities", joinCodes(next))}
        />

        <div className="grid grid-cols-2 gap-3">
          <Field
            label="Có người lao động"
            htmlFor={COMPANY_FIELD_IDS.hasEmployees}
            error={errors.hasEmployees}
          >
            <Select
              id={COMPANY_FIELD_IDS.hasEmployees}
              value={values.hasEmployees}
              onChange={(event) =>
                onFieldChange("hasEmployees", event.target.value)
              }
              options={PRESENCE_OPTIONS}
              placeholder="Chọn"
              className={values.hasEmployees === "" ? "text-subtle" : undefined}
            />
          </Field>
          <Field
            label="Có nhà thầu, thuê ngoài"
            htmlFor={COMPANY_FIELD_IDS.hasContractors}
            error={errors.hasContractors}
          >
            <Select
              id={COMPANY_FIELD_IDS.hasContractors}
              value={values.hasContractors}
              onChange={(event) =>
                onFieldChange("hasContractors", event.target.value)
              }
              options={PRESENCE_OPTIONS}
              placeholder="Chọn"
              className={
                values.hasContractors === "" ? "text-subtle" : undefined
              }
            />
          </Field>
        </div>

        <Field
          label="Thị trường và nhóm khách hàng"
          htmlFor={COMPANY_FIELD_IDS.markets}
          error={errors.markets}
        >
          <Textarea
            id={COMPANY_FIELD_IDS.markets}
            value={values.markets}
            onChange={(event) => onFieldChange("markets", event.target.value)}
            placeholder="Trong nước hoặc xuất khẩu; doanh nghiệp, cá nhân hoặc cơ quan công"
            rows={2}
          />
        </Field>

        <Field
          label="Khoảng doanh thu"
          htmlFor={COMPANY_FIELD_IDS.revenueBand}
          error={errors.revenueBand}
        >
          <Select
            id={COMPANY_FIELD_IDS.revenueBand}
            value={values.revenueBand}
            onChange={(event) => onFieldChange("revenueBand", event.target.value)}
            options={REVENUE_BANDS}
            placeholder="Không bắt buộc"
            className={values.revenueBand === "" ? "text-subtle" : undefined}
          />
        </Field>

        <Field
          label="Nhóm nhà cung cấp quan trọng"
          htmlFor={COMPANY_FIELD_IDS.supplierGroups}
          error={errors.supplierGroups}
        >
          <Textarea
            id={COMPANY_FIELD_IDS.supplierGroups}
            value={values.supplierGroups}
            onChange={(event) =>
              onFieldChange("supplierGroups", event.target.value)
            }
            placeholder="Mỗi nhóm một dòng: Nhóm | Tiêu chí hoặc rủi ro | Cách xử lý"
            rows={3}
          />
        </Field>

        <Field
          label="Nhóm đối tác đầu ra"
          htmlFor={COMPANY_FIELD_IDS.downstreamGroups}
          error={errors.downstreamGroups}
        >
          <Textarea
            id={COMPANY_FIELD_IDS.downstreamGroups}
            value={values.downstreamGroups}
            onChange={(event) =>
              onFieldChange("downstreamGroups", event.target.value)
            }
            placeholder="Ví dụ: nhà phân phối, cơ sở giáo dục"
            rows={2}
          />
        </Field>

        <Field
          label="Phạm vi hoặc số liệu còn thiếu, chưa chắc chắn"
          htmlFor={COMPANY_FIELD_IDS.dataLimitations}
          error={errors.dataLimitations}
        >
          <Textarea
            id={COMPANY_FIELD_IDS.dataLimitations}
            value={values.dataLimitations}
            onChange={(event) =>
              onFieldChange("dataLimitations", event.target.value)
            }
            placeholder="Cơ sở chưa thu thập được, dữ liệu ước tính và phương pháp"
            rows={3}
          />
        </Field>

        <Field
          label="Vai trò người xác nhận thông tin"
          htmlFor={COMPANY_FIELD_IDS.confirmingRole}
          error={errors.confirmingRole}
        >
          <Input
            id={COMPANY_FIELD_IDS.confirmingRole}
            value={values.confirmingRole}
            onChange={(event) =>
              onFieldChange("confirmingRole", event.target.value)
            }
            placeholder="Ví dụ: Giám đốc, Kế toán trưởng"
          />
        </Field>
      </div>
    </details>
  );
}
