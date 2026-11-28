"use client";

import {
  BANK_AI_CASE_FIELDS,
  BANK_AI_EXPECTED_OPTIONS,
  BANK_AI_TEST_STATUS_OPTIONS,
  BANK_EVIDENCE_APPLY_OPTIONS,
  BANK_EVIDENCE_CODES,
  BANK_EVIDENCE_CODE_LABELS,
  BANK_EVIDENCE_TEXT_FIELDS,
  type BankAiCaseFieldKey,
  type BankEvidenceFieldKey,
} from "@esg/shared";
import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui";

import { shorten } from "../lib/bank";
import { emptyTestCase, type EvidenceForm } from "../lib/question-form";
import {
  AreaField,
  ChoiceField,
  Section,
  TextField,
} from "./form-controls";

const MAX_CASES = 30;

const CASE_LONG_FIELDS: readonly BankAiCaseFieldKey[] = [
  "scenario",
  "input",
  "basis",
  "forbidden",
  "result",
  "note",
];

const CASE_OPTIONS: Partial<Record<BankAiCaseFieldKey, readonly string[]>> = {
  expected: BANK_AI_EXPECTED_OPTIONS,
  testStatus: BANK_AI_TEST_STATUS_OPTIONS,
};

interface EvidenceProps {
  evidence: EvidenceForm;
  onChange: (evidence: EvidenceForm) => void;
}

function listOptions(values: readonly string[]) {
  return values.map((value) => ({ value, label: value }));
}

export function EvidenceSection({ evidence, onChange }: EvidenceProps) {
  const filled = BANK_EVIDENCE_TEXT_FIELDS.filter(
    ([key]) => evidence.fields[key] !== "",
  ).length;
  const setField = (key: BankEvidenceFieldKey) => (value: string) =>
    onChange({ ...evidence, fields: { ...evidence.fields, [key]: value } });

  return (
    <Section
      title="Quy tắc minh chứng"
      summary={`${filled}/${BANK_EVIDENCE_TEXT_FIELDS.length} mục đã điền`}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <ChoiceField
          label="Loại quy tắc"
          value={evidence.code}
          emptyLabel="Theo loại trả lời"
          options={BANK_EVIDENCE_CODES.map((value) => ({
            value,
            label: `${value} · ${BANK_EVIDENCE_CODE_LABELS[value]}`,
          }))}
          onChange={(code) => onChange({ ...evidence, code })}
        />
        <ChoiceField
          label="Cách áp dụng"
          value={evidence.fields.apply}
          emptyLabel="Chưa chọn"
          options={listOptions(BANK_EVIDENCE_APPLY_OPTIONS)}
          onChange={setField("apply")}
        />
      </div>
      {BANK_EVIDENCE_TEXT_FIELDS.map(([key, label]) => (
        <AreaField
          key={key}
          label={label}
          value={evidence.fields[key]}
          onChange={setField(key)}
        />
      ))}
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Phiên bản quy tắc"
          value={evidence.fields.ruleVersion}
          maxLength={4000}
          onChange={setField("ruleVersion")}
        />
        <TextField
          label="Duyệt quy tắc"
          value={evidence.fields.approval}
          maxLength={4000}
          suggestions={["Chờ duyệt", "Cần sửa", "Đã duyệt"]}
          onChange={setField("approval")}
        />
        <TextField
          label="Người duyệt quy tắc"
          value={evidence.fields.reviewedBy}
          maxLength={4000}
          onChange={setField("reviewedBy")}
        />
        <TextField
          label="Ngày duyệt quy tắc"
          value={evidence.fields.reviewedOn}
          maxLength={4000}
          placeholder="2026-11-27"
          onChange={setField("reviewedOn")}
        />
      </div>
      <AreaField
        label="Góp ý cho quy tắc"
        value={evidence.fields.reviewNote}
        onChange={setField("reviewNote")}
      />
    </Section>
  );
}

export function TestCaseSection({
  evidence,
  onChange,
  readOnly,
}: EvidenceProps & { readOnly: boolean }) {
  const cases = evidence.testCases;

  function setCase(index: number, key: BankAiCaseFieldKey, value: string) {
    onChange({
      ...evidence,
      testCases: cases.map((item, position) =>
        position === index ? { ...item, [key]: value } : item,
      ),
    });
  }

  return (
    <Section title="Ca kiểm thử AI" summary={`${cases.length} ca`}>
      {cases.length === 0 ? (
        <p className="text-sm text-muted">Câu này chưa có ca kiểm thử.</p>
      ) : null}
      {cases.map((item, index) => (
        <Section
          key={index}
          title={item.id || "Ca mới"}
          summary={[shorten(item.scenario, 40), item.testStatus]
            .filter(Boolean)
            .join(" · ")}
          defaultOpen={item.id === ""}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            {BANK_AI_CASE_FIELDS.filter(([key]) => key !== "id").map(
              ([key, label]) => {
                const options = CASE_OPTIONS[key];
                const change = (value: string) => setCase(index, key, value);
                if (CASE_LONG_FIELDS.includes(key)) {
                  return (
                    <div key={key} className="sm:col-span-2">
                      <AreaField
                        label={label}
                        value={item[key]}
                        onChange={change}
                      />
                    </div>
                  );
                }
                return options ? (
                  <ChoiceField
                    key={key}
                    label={label}
                    value={item[key]}
                    emptyLabel="Chưa chọn"
                    options={listOptions(options)}
                    onChange={change}
                  />
                ) : (
                  <TextField
                    key={key}
                    label={label}
                    value={item[key]}
                    maxLength={4000}
                    suggestions={
                      key === "needsReview" ? ["Có", "Không"] : undefined
                    }
                    onChange={change}
                  />
                );
              },
            )}
          </div>
          {readOnly ? null : (
            <Button
              variant="ghost"
              size="sm"
              leadingIcon={<Trash2 aria-hidden className="size-4" />}
              onClick={() =>
                onChange({
                  ...evidence,
                  testCases: cases.filter(
                    (_, position) => position !== index,
                  ),
                })
              }
            >
              Bỏ ca này
            </Button>
          )}
        </Section>
      ))}
      {readOnly ? null : (
        <Button
          variant="secondary"
          size="sm"
          disabled={cases.length >= MAX_CASES}
          leadingIcon={<Plus aria-hidden className="size-4" />}
          onClick={() =>
            onChange({ ...evidence, testCases: [...cases, emptyTestCase()] })
          }
        >
          Thêm ca kiểm thử
        </Button>
      )}
    </Section>
  );
}
