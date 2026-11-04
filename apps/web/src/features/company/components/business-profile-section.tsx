"use client";

import {
  CAPABILITY_OPTIONS,
  LEGAL_FORMS,
  PRESENCE_OPTIONS,
  REVENUE_BANDS,
  joinCodes,
  splitCodes,
} from "@esg/shared";
import { Field, Input, Select, Textarea } from "@/components/ui";
import { industryOptions } from "@/data";

import { COMPANY_FIELD_IDS } from "../constants";
import type { CompanyField, CompanyFormValues } from "../constants";
import { CollapsibleSection } from "./collapsible-section";

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
    <CollapsibleSection title="Bối cảnh doanh nghiệp">
      <p className="text-xs leading-relaxed text-subtle">
        Các mục này giúp báo cáo mô tả đúng hoạt động của doanh nghiệp. Mục
        nào để trống thì sẽ không xuất hiện trong báo cáo.
      </p>

      <Field
        label="Tên thương hiệu / tên giao dịch"
        htmlFor={COMPANY_FIELD_IDS.tradingName}
        hint="Tên bạn thường dùng với khách hàng, nếu khác tên đăng ký. Tên này được in ở đầu mỗi trang báo cáo."
        error={errors.tradingName}
      >
        <Input
          id={COMPANY_FIELD_IDS.tradingName}
          value={values.tradingName}
          onChange={(event) => onFieldChange("tradingName", event.target.value)}
          placeholder="Ví dụ: ESG Studio"
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
          placeholder="Chọn loại hình theo giấy đăng ký"
          className={values.legalForm === "" ? "text-subtle" : undefined}
        />
      </Field>

      <CheckboxGroup
        legend="Ngành bổ sung"
        hint="Chỉ chọn khi doanh nghiệp có hoạt động thực tế ngoài lĩnh vực chính."
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
        hint="Nơi hoạt động được tính vào báo cáo (văn phòng, nhà máy, kho…). Điền theo mẫu: Tên cơ sở | Việc được tính | Phần không tính. Có nhiều cơ sở thì xuống dòng cho cơ sở tiếp theo."
        error={errors.sites}
      >
        <Textarea
          id={COMPANY_FIELD_IDS.sites}
          value={values.sites}
          onChange={(event) => onFieldChange("sites", event.target.value)}
          placeholder="Văn phòng TP.HCM | Thiết kế, lập trình | Không gồm nhà máy gia công"
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
          placeholder="Ví dụ: Robot đồng hành cho trường học; phần mềm AI giáo dục"
          rows={3}
        />
      </Field>

      <CheckboxGroup
        legend="Hoạt động đặc thù"
        hint="Chọn những hoạt động mà doanh nghiệp đang thực hiện."
        options={CAPABILITY_OPTIONS}
        selected={splitCodes(values.capabilities)}
        idPrefix="company-capability"
        onChange={(next) => onFieldChange("capabilities", joinCodes(next))}
      />

      <Field
        label="Doanh nghiệp có người lao động trong kỳ báo cáo không?"
        htmlFor={COMPANY_FIELD_IDS.hasEmployees}
        hint="Tính cả nhân viên chính thức và thời vụ do doanh nghiệp trực tiếp thuê."
        error={errors.hasEmployees}
      >
        <Select
          id={COMPANY_FIELD_IDS.hasEmployees}
          value={values.hasEmployees}
          onChange={(event) => onFieldChange("hasEmployees", event.target.value)}
          options={PRESENCE_OPTIONS}
          placeholder="Chọn câu trả lời"
          className={values.hasEmployees === "" ? "text-subtle" : undefined}
        />
      </Field>

      <Field
        label="Có dùng nhà thầu hoặc lao động thuê ngoài không?"
        htmlFor={COMPANY_FIELD_IDS.hasContractors}
        hint="Ví dụ: đơn vị gia công, bảo vệ, vệ sinh, lao động do công ty khác cung cấp."
        error={errors.hasContractors}
      >
        <Select
          id={COMPANY_FIELD_IDS.hasContractors}
          value={values.hasContractors}
          onChange={(event) =>
            onFieldChange("hasContractors", event.target.value)
          }
          options={PRESENCE_OPTIONS}
          placeholder="Chọn câu trả lời"
          className={values.hasContractors === "" ? "text-subtle" : undefined}
        />
      </Field>

      <Field
        label="Thị trường và nhóm khách hàng"
        htmlFor={COMPANY_FIELD_IDS.markets}
        error={errors.markets}
      >
        <Textarea
          id={COMPANY_FIELD_IDS.markets}
          value={values.markets}
          onChange={(event) => onFieldChange("markets", event.target.value)}
          placeholder="Ví dụ: Việt Nam — trường học, gia đình và đối tác giáo dục"
          rows={2}
        />
      </Field>

      <Field
        label="Khoảng doanh thu"
        htmlFor={COMPANY_FIELD_IDS.revenueBand}
        hint="Chỉ hiển thị khi bạn chọn. Không dùng để chấm điểm ESG."
        error={errors.revenueBand}
      >
        <Select
          id={COMPANY_FIELD_IDS.revenueBand}
          value={values.revenueBand}
          onChange={(event) => onFieldChange("revenueBand", event.target.value)}
          options={REVENUE_BANDS}
          placeholder="Chọn khoảng doanh thu"
          className={values.revenueBand === "" ? "text-subtle" : undefined}
        />
      </Field>

      <Field
        label="Nhóm nhà cung cấp quan trọng"
        htmlFor={COMPANY_FIELD_IDS.supplierGroups}
        hint="Điền theo mẫu: Tên nhóm | Rủi ro hoặc tiêu chí | Cách xử lý. Có nhiều nhóm thì xuống dòng cho nhóm tiếp theo."
        error={errors.supplierGroups}
      >
        <Textarea
          id={COMPANY_FIELD_IDS.supplierGroups}
          value={values.supplierGroups}
          onChange={(event) =>
            onFieldChange("supplierGroups", event.target.value)
          }
          placeholder="Đối tác gia công | Nguồn gốc linh kiện | Bổ sung yêu cầu vào hợp đồng"
          rows={3}
        />
      </Field>

      <Field
        label="Nhóm đối tác đầu ra"
        htmlFor={COMPANY_FIELD_IDS.downstreamGroups}
        hint="Những bên nhận sản phẩm, dịch vụ của doanh nghiệp."
        error={errors.downstreamGroups}
      >
        <Textarea
          id={COMPANY_FIELD_IDS.downstreamGroups}
          value={values.downstreamGroups}
          onChange={(event) =>
            onFieldChange("downstreamGroups", event.target.value)
          }
          placeholder="Ví dụ: Nhà phân phối, cơ sở giáo dục, người dùng gia đình"
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
          placeholder="Ví dụ: Chưa có số liệu của nhà máy gia công; số liệu điện, nước là số ước tính"
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
    </CollapsibleSection>
  );
}
