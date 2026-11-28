"use client";

import {
  BANK_INPUT_TYPE_LABELS,
  BANK_PROFILE_INPUT_TYPES,
  BANK_REPORT_SECTIONS,
  BANK_REVIEW_LABELS,
  BANK_ROLLOUT_LABELS,
  CAPABILITY_OPTIONS,
  INPUT_TYPES,
  type BankSource,
} from "@esg/shared";

import { Switch } from "@/components/ui";
import { toOptions } from "@/features/backoffice/lib/labels";

import { PILLAR_LABELS, SECTOR_FREE_SOURCES, TIER_LABELS } from "../lib/bank";
import { defaultEvidenceCode, type QuestionForm } from "../lib/question-form";
import {
  AreaField,
  ChoiceField,
  Section,
  TextField,
} from "./form-controls";

export type QuestionErrors = Partial<Record<"text" | "pillar", string>>;

interface SectionProps {
  form: QuestionForm;
  onChange: (patch: Partial<QuestionForm>) => void;
}

export function ContentSection({
  form,
  onChange,
  errors,
  codeEditable,
  suggestedCode,
  topics,
}: SectionProps & {
  errors: QuestionErrors;
  codeEditable: boolean;
  suggestedCode: string;
  topics: readonly string[];
}) {
  return (
    <Section title="Nội dung" defaultOpen>
      <div className="grid gap-4 sm:grid-cols-[12rem_minmax(0,1fr)]">
        <TextField
          label="Mã câu"
          value={form.code}
          maxLength={10}
          readOnly={!codeEditable}
          placeholder={suggestedCode}
          hint={
            codeEditable
              ? "Để trống để tự cấp mã."
              : "Đã xuất bản nên không đổi."
          }
          onChange={(code) => onChange({ code: code.toUpperCase() })}
        />
        <TextField
          label="Chủ đề"
          value={form.topic}
          maxLength={200}
          suggestions={topics}
          hint="Tên nhóm câu hỏi được lấy theo chủ đề."
          onChange={(topic) => onChange({ topic })}
        />
      </div>
      <AreaField
        label="Câu hỏi"
        required
        rows={3}
        maxLength={2000}
        value={form.text}
        error={errors.text}
        onChange={(text) => onChange({ text })}
      />
      <AreaField
        label="Hướng dẫn trả lời"
        value={form.guidance}
        onChange={(guidance) => onChange({ guidance })}
      />
      <AreaField
        label="Gợi ý minh chứng"
        value={form.evidenceHint}
        onChange={(evidenceHint) => onChange({ evidenceHint })}
      />
      <AreaField
        label="Gợi ý cải thiện"
        value={form.improvementHint}
        onChange={(improvementHint) => onChange({ improvementHint })}
      />
    </Section>
  );
}

export function AnswerSection({
  form,
  onChange,
  errors,
  source,
}: SectionProps & { errors: QuestionErrors; source: BankSource }) {
  const isProfile = source === "PROFILE";
  const inputTypes: readonly string[] = isProfile
    ? [...INPUT_TYPES, ...BANK_PROFILE_INPUT_TYPES]
    : INPUT_TYPES;
  const known: readonly string[] = CAPABILITY_OPTIONS.map(
    (option) => option.value,
  );
  const capabilities = [
    ...CAPABILITY_OPTIONS,
    ...form.capabilities
      .filter((value) => !known.includes(value))
      .map((value) => ({ value, label: value })),
  ];

  function changeInputType(inputType: string) {
    const follows =
      form.evidence.code === "" ||
      form.evidence.code === defaultEvidenceCode(form.inputType);
    onChange({
      inputType,
      ...(follows && form.evidence.code !== ""
        ? {
            evidence: {
              ...form.evidence,
              code: defaultEvidenceCode(inputType),
            },
          }
        : {}),
    });
  }

  return (
    <Section title="Cách trả lời & hiển thị" defaultOpen>
      <div className="grid gap-4 sm:grid-cols-2">
        {isProfile ? null : (
          <ChoiceField
            label="Trụ cột"
            required
            value={form.pillar}
            emptyLabel="Chọn trụ cột"
            options={toOptions(PILLAR_LABELS)}
            error={errors.pillar}
            onChange={(pillar) => onChange({ pillar })}
          />
        )}
        <ChoiceField
          label="Loại trả lời"
          value={form.inputType}
          options={inputTypes.map((value) => ({
            value,
            label: BANK_INPUT_TYPE_LABELS[value] ?? value,
          }))}
          onChange={changeInputType}
        />
        <TextField
          label="Đơn vị"
          value={form.unit}
          maxLength={50}
          hint="Dùng cho câu số liệu, ví dụ: kWh."
          onChange={(unit) => onChange({ unit })}
        />
        <ChoiceField
          label="Mức khai báo"
          value={form.declarationLevel}
          options={toOptions(TIER_LABELS)}
          hint="Mức mở rộng chỉ hỏi doanh nghiệp từ 50 người."
          onChange={(value) =>
            onChange({
              declarationLevel: value === "extended" ? "extended" : "basic",
            })
          }
        />
        <ChoiceField
          label="Phần trong báo cáo"
          value={form.reportSection}
          emptyLabel="Chưa chọn"
          options={BANK_REPORT_SECTIONS.map((value) => ({
            value,
            label: value === "INTERNAL" ? "Chỉ dùng nội bộ" : value,
          }))}
          onChange={(reportSection) => onChange({ reportSection })}
        />
        <TextField
          label="Nguồn tham chiếu"
          value={form.sourceRef}
          maxLength={100}
          onChange={(sourceRef) => onChange({ sourceRef })}
        />
      </div>
      <Switch
        id="question-required"
        label="Bắt buộc trả lời"
        checked={form.required}
        onChange={(required) => onChange({ required })}
      />
      {SECTOR_FREE_SOURCES.includes(source) ? null : (
        <fieldset className="space-y-2">
          <legend className="text-[0.8125rem] font-medium">
            Chỉ hỏi khi doanh nghiệp có hoạt động
          </legend>
          <p className="text-xs text-subtle">
            Không chọn gì nghĩa là hỏi mọi doanh nghiệp thuộc ngành này.
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {capabilities.map((option) => (
              <label
                key={option.value}
                className="inline-flex items-center gap-2 text-sm"
              >
                <input
                  type="checkbox"
                  className="size-4 accent-primary-700"
                  checked={form.capabilities.includes(option.value)}
                  onChange={(event) =>
                    onChange({
                      capabilities: event.target.checked
                        ? [...form.capabilities, option.value]
                        : form.capabilities.filter(
                            (value) => value !== option.value,
                          ),
                    })
                  }
                />
                {option.label}
              </label>
            ))}
          </div>
        </fieldset>
      )}
    </Section>
  );
}

export function ReviewSection({ form, onChange }: SectionProps) {
  return (
    <Section
      title="Duyệt"
      summary={BANK_REVIEW_LABELS[form.reviewStatus]}
      defaultOpen
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <ChoiceField
          label="Trạng thái duyệt"
          value={form.reviewStatus}
          options={toOptions(BANK_REVIEW_LABELS)}
          hint="Chỉ câu Đã duyệt mới hiện trong khảo sát."
          onChange={(value) =>
            onChange({
              reviewStatus: value as QuestionForm["reviewStatus"],
            })
          }
        />
        <ChoiceField
          label="Tình trạng triển khai"
          value={form.rolloutStatus}
          options={toOptions(BANK_ROLLOUT_LABELS)}
          hint="Chỉ để theo dõi công việc."
          onChange={(value) =>
            onChange({
              rolloutStatus: value as QuestionForm["rolloutStatus"],
            })
          }
        />
        <TextField
          label="Người duyệt"
          value={form.reviewedBy}
          maxLength={100}
          hint="Để trống khi duyệt: tự điền tên bạn."
          onChange={(reviewedBy) => onChange({ reviewedBy })}
        />
        <TextField
          label="Ngày duyệt"
          type="date"
          value={form.reviewedOn}
          hint="Để trống khi duyệt: tự điền hôm nay."
          onChange={(reviewedOn) => onChange({ reviewedOn })}
        />
      </div>
      <AreaField
        label="Góp ý khi duyệt"
        value={form.reviewNote}
        onChange={(reviewNote) => onChange({ reviewNote })}
      />
    </Section>
  );
}
