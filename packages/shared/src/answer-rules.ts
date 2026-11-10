import type { InputType } from "./constants";
import type { Question } from "./survey";
import { msg } from "./i18n";

export interface AnswerChoice {
  readonly value: string;
  readonly label: string;
}

export type DetailKind = "none" | "note" | "reason" | "content";

export interface AnswerFields {
  readonly numberInput: boolean;
  readonly detail: DetailKind;
  readonly detailRequired: boolean;
  readonly evidence: boolean;
}

export type AnswerIssue = "unanswered" | "missing-detail" | "invalid-number";

export interface AnswerInput {
  readonly value: string | null;
  readonly number: string;
  readonly description: string;
}

const PRACTICE_CHOICES: readonly AnswerChoice[] = [
  { value: "yes", label: msg("Có") },
  { value: "partial", label: msg("Có một phần") },
  { value: "no", label: msg("Chưa có") },
  { value: "unknown", label: msg("Chưa rõ") },
  { value: "na", label: msg("Không áp dụng") },
];

const INCIDENT_CHOICES: readonly AnswerChoice[] = [
  { value: "yes", label: msg("Có") },
  { value: "no", label: msg("Không") },
  { value: "unknown", label: msg("Chưa xác minh") },
];

const PRESENCE_CHOICES: readonly AnswerChoice[] = [
  { value: "yes", label: msg("Có") },
  { value: "no", label: msg("Không") },
  { value: "unknown", label: msg("Chưa rõ") },
];

const DATA_CHOICES: readonly AnswerChoice[] = [
  { value: "known", label: msg("Đã có số liệu") },
  { value: "unknown", label: msg("Chưa có số liệu") },
  { value: "na", label: msg("Không áp dụng") },
];

const TEXT_CHOICES: readonly AnswerChoice[] = [
  { value: "provided", label: msg("Có nội dung") },
  { value: "unknown", label: msg("Chưa rõ") },
  { value: "na", label: msg("Không áp dụng") },
];

const NO_FIELDS: AnswerFields = {
  numberInput: false,
  detail: "none",
  detailRequired: false,
  evidence: false,
};

const REASON_FIELDS: AnswerFields = {
  numberInput: false,
  detail: "reason",
  detailRequired: true,
  evidence: false,
};

export function getAnswerChoices(inputType: InputType): readonly AnswerChoice[] {
  switch (inputType) {
    case "PRACTICE":
      return PRACTICE_CHOICES;
    case "INCIDENT":
      return INCIDENT_CHOICES;
    case "PRESENCE":
      return PRESENCE_CHOICES;
    case "TEXT":
      return TEXT_CHOICES;
    case "NUMBER":
    case "INTEGER":
    case "FUEL_TABLE":
    case "WORKFORCE_TABLE":
      return DATA_CHOICES;
  }
}

export function getChoiceLabel(
  inputType: InputType,
  value: string | null,
): string | null {
  if (value === null) {
    return null;
  }
  return (
    getAnswerChoices(inputType).find((choice) => choice.value === value)
      ?.label ?? null
  );
}

export function getAnswerFields(
  inputType: InputType,
  value: string | null,
): AnswerFields {
  if (value === null) {
    return NO_FIELDS;
  }
  if (value === "na") {
    return REASON_FIELDS;
  }
  switch (inputType) {
    case "PRACTICE":
      return value === "yes" || value === "partial"
        ? { numberInput: false, detail: "note", detailRequired: false, evidence: true }
        : NO_FIELDS;
    case "INCIDENT":
      return value === "yes"
        ? { numberInput: false, detail: "content", detailRequired: true, evidence: true }
        : NO_FIELDS;
    case "PRESENCE":
      return NO_FIELDS;
    case "NUMBER":
    case "INTEGER":
      return value === "known"
        ? { numberInput: true, detail: "note", detailRequired: false, evidence: true }
        : NO_FIELDS;
    case "FUEL_TABLE":
    case "WORKFORCE_TABLE":
      return value === "known"
        ? { numberInput: false, detail: "content", detailRequired: true, evidence: true }
        : NO_FIELDS;
    case "TEXT":
      if (value === "provided") {
        return { numberInput: false, detail: "content", detailRequired: true, evidence: true };
      }
      return value === "unknown"
        ? { numberInput: false, detail: "note", detailRequired: true, evidence: false }
        : NO_FIELDS;
  }
}

export function isValidNumber(input: string, inputType: InputType): boolean {
  const text = input.trim();
  return inputType === "INTEGER"
    ? /^\d+$/.test(text)
    : /^\d+([.,]\d+)?$/.test(text);
}

export function getAnswerIssues(
  question: Pick<Question, "inputType" | "required">,
  answer: AnswerInput,
): AnswerIssue[] {
  const choices = getAnswerChoices(question.inputType);
  const isKnownValue =
    answer.value !== null &&
    choices.some((choice) => choice.value === answer.value);
  if (!isKnownValue) {
    return question.required ? ["unanswered"] : [];
  }
  const fields = getAnswerFields(question.inputType, answer.value);
  const issues: AnswerIssue[] = [];
  if (fields.numberInput && !isValidNumber(answer.number, question.inputType)) {
    issues.push("invalid-number");
  }
  if (fields.detailRequired && answer.description.trim().length === 0) {
    issues.push("missing-detail");
  }
  return issues;
}

export function isAnswerComplete(
  question: Pick<Question, "inputType" | "required">,
  answer: AnswerInput,
): boolean {
  return getAnswerIssues(question, answer).length === 0;
}
