import {
  BANK_AI_CASE_FIELDS,
  BANK_EVIDENCE_FIELDS,
  type BankAiCase,
  type BankAiCaseFieldKey,
  type BankEvidenceCode,
  type BankEvidenceFieldKey,
  type BankQuestionView,
  type BankSource,
} from "@esg/shared";

export interface EvidenceForm {
  code: string;
  fields: Record<BankEvidenceFieldKey, string>;
  testCases: Record<BankAiCaseFieldKey, string>[];
}

export interface QuestionForm {
  code: string;
  text: string;
  topic: string;
  pillar: string;
  guidance: string;
  evidenceHint: string;
  improvementHint: string;
  inputType: string;
  unit: string;
  required: boolean;
  declarationLevel: BankQuestionView["declarationLevel"];
  capabilities: string[];
  reportSection: string;
  sourceRef: string;
  reviewStatus: BankQuestionView["reviewStatus"];
  reviewNote: string;
  reviewedBy: string;
  reviewedOn: string;
  rolloutStatus: BankQuestionView["rolloutStatus"];
  evidence: EvidenceForm;
}

const DEFAULT_EVIDENCE: Readonly<Record<string, BankEvidenceCode>> = {
  PRACTICE: "EV-PRACTICE",
  INCIDENT: "EV-INCIDENT",
  NUMBER: "EV-DATA",
  INTEGER: "EV-DATA",
};

export function defaultEvidenceCode(inputType: string): BankEvidenceCode {
  return DEFAULT_EVIDENCE[inputType] ?? "EV-OPTIONAL";
}

function record<K extends string>(
  keys: readonly K[],
  source: Partial<Record<K, string>>,
): Record<K, string> {
  return Object.fromEntries(
    keys.map((key) => [key, source[key] ?? ""]),
  ) as Record<K, string>;
}

const EVIDENCE_KEYS = BANK_EVIDENCE_FIELDS.map(([key]) => key);
const CASE_KEYS = BANK_AI_CASE_FIELDS.map(([key]) => key);

export function emptyTestCase(): Record<BankAiCaseFieldKey, string> {
  return record(CASE_KEYS, {});
}

function evidenceForm(question: BankQuestionView): EvidenceForm {
  const rule = question.evidenceRule;
  return {
    code: rule?.code ?? "",
    fields: record(EVIDENCE_KEYS, rule ?? {}),
    testCases: (rule?.testCases ?? []).map((item: BankAiCase) =>
      record(CASE_KEYS, item),
    ),
  };
}

export function toForm(question: BankQuestionView): QuestionForm {
  return {
    code: question.code,
    text: question.text,
    topic: question.topic,
    pillar: question.pillar ?? "",
    guidance: question.guidance,
    evidenceHint: question.evidenceHint,
    improvementHint: question.improvementHint,
    inputType: question.inputType,
    unit: question.unit,
    required: question.required,
    declarationLevel: question.declarationLevel,
    capabilities: question.capabilities,
    reportSection: question.reportSection,
    sourceRef: question.sourceRef,
    reviewStatus: question.reviewStatus,
    reviewNote: question.reviewNote,
    reviewedBy: question.reviewedBy,
    reviewedOn: question.reviewedOn,
    rolloutStatus: question.rolloutStatus,
    evidence: evidenceForm(question),
  };
}

export function newForm(
  source: BankSource,
  template: QuestionForm | null,
): QuestionForm {
  if (template !== null) {
    return {
      ...template,
      code: "",
      reviewStatus: "pending",
      reviewNote: "",
      reviewedBy: "",
      reviewedOn: "",
      rolloutStatus: "not_started",
      evidence: {
        ...template.evidence,
        fields: {
          ...template.evidence.fields,
          approval: "",
          reviewNote: "",
          reviewedBy: "",
          reviewedOn: "",
        },
        testCases: [],
      },
    };
  }
  const inputType = source === "PROFILE" ? "TEXT" : "PRACTICE";
  return {
    code: "",
    text: "",
    topic: "",
    pillar: "",
    guidance: "",
    evidenceHint: "",
    improvementHint: "",
    inputType,
    unit: "",
    required: true,
    declarationLevel: "basic",
    capabilities: [],
    reportSection: "",
    sourceRef: "",
    reviewStatus: "pending",
    reviewNote: "",
    reviewedBy: "",
    reviewedOn: "",
    rolloutStatus: "not_started",
    evidence: {
      code: defaultEvidenceCode(inputType),
      fields: record(EVIDENCE_KEYS, {}),
      testCases: [],
    },
  };
}

export function sameValue(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function changedKeys(
  form: QuestionForm,
  base: QuestionForm,
): (keyof QuestionForm)[] {
  return (Object.keys(form) as (keyof QuestionForm)[]).filter(
    (key) => !sameValue(form[key], base[key]),
  );
}

export function mergeForm(
  form: QuestionForm,
  base: QuestionForm,
  incoming: QuestionForm,
): QuestionForm {
  const edited = new Set(changedKeys(form, base));
  return Object.fromEntries(
    (Object.keys(incoming) as (keyof QuestionForm)[]).map((key) => [
      key,
      edited.has(key) ? form[key] : incoming[key],
    ]),
  ) as unknown as QuestionForm;
}

function evidencePayload(evidence: EvidenceForm, inputType: string) {
  return {
    ...evidence.fields,
    code: evidence.code || defaultEvidenceCode(inputType),
    testCases: evidence.testCases,
  };
}

function fieldPayload(form: QuestionForm, key: keyof QuestionForm) {
  if (key === "evidence") {
    return ["evidenceRule", evidencePayload(form.evidence, form.inputType)];
  }
  if (key === "pillar") {
    return ["pillar", form.pillar === "" ? null : form.pillar];
  }
  return [key, form[key]];
}

export function patchPayload(form: QuestionForm, base: QuestionForm) {
  return Object.fromEntries(
    changedKeys(form, base).map((key) => fieldPayload(form, key)),
  );
}

export function createPayload(
  form: QuestionForm,
  source: BankSource,
  pristine: QuestionForm,
) {
  const skipped = new Set<keyof QuestionForm>([
    ...(form.code.trim() === "" ? (["code"] as const) : []),
    ...(form.reviewedBy.trim() === "" ? (["reviewedBy"] as const) : []),
    ...(form.reviewedOn === "" ? (["reviewedOn"] as const) : []),
    ...(source === "PROFILE" ? (["pillar"] as const) : []),
    ...(sameValue(form.evidence, pristine.evidence)
      ? (["evidence"] as const)
      : []),
    ...(source === "PROFILE" || source === "COMMON"
      ? (["capabilities"] as const)
      : []),
  ]);
  return {
    source,
    ...Object.fromEntries(
      (Object.keys(form) as (keyof QuestionForm)[])
        .filter((key) => !skipped.has(key))
        .map((key) => fieldPayload(form, key)),
    ),
  };
}
