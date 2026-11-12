import { HEADCOUNT_TIERS, INDUSTRY_SOURCES } from "./constants";
import type { IndustryValue } from "./constants";
import {
  getAnswerFields,
  getAnswerIssues,
  getChoiceLabel,
} from "./answer-rules";
import {
  formatPeriodRange,
  formatQuantity,
  formatVersionStamp,
  formatVietnamDate,
  parseQuantity,
} from "./report-format";
import { msg } from "./i18n";
import { REPORT_QUESTION_LABELS } from "./report-labels";
import {
  CAPABILITY_OPTIONS,
  PRESENCE_OPTIONS,
  REVENUE_BANDS,
  findOptionLabel,
  parseTableLines,
  splitCodes,
} from "./profile";
import { EMPTY_PLAN, PLAN_STATUSES } from "./report-types";
import type {
  ChartDatum,
  PracticeCounts,
  ReportAction,
  ReportAnswerInput,
  ReportAppendixRow,
  ReportEvidenceGroup,
  ReportEvidenceRow,
  ReportGap,
  ReportItem,
  ReportMetric,
  ReportModel,
  ReportModule,
  ReportSection,
  ReportSuggestion,
  ImprovementPlanInput,
  PlanStatus,
  PlanTaskInput,
} from "./report-types";
import { t, withTranslator } from "./report-text";
import type { ReportTranslator } from "./report-text";
import type { Question, Survey } from "./survey";

export interface ReportBuildInput {
  readonly survey: Survey;
  readonly company: Readonly<Record<string, string>>;
  readonly answers: Readonly<Record<string, ReportAnswerInput>>;
  readonly reportCode: string | null;
  readonly generatedAt: string;
  readonly contentVersion: string;
  readonly isDraft: boolean;
  readonly plan?: ImprovementPlanInput;
  readonly translate?: ReportTranslator;
}

interface Entry {
  readonly question: Question;
  readonly pillarId: string;
  readonly pillarName: string;
  readonly groupTitle: string;
}

const EMPTY_ANSWER: ReportAnswerInput = {
  value: null,
  number: "",
  description: "",
  evidence: [],
};

const INDUSTRY_LABELS: Record<IndustryValue, string> = {
  manufacturing: msg("Sản xuất"),
  retail: msg("Thương mại và bán lẻ"),
  services: msg("Dịch vụ"),
  it: msg("Công nghệ thông tin"),
  construction: msg("Xây dựng và bất động sản"),
  agriculture: msg("Nông nghiệp và thực phẩm"),
  education: msg("Giáo dục và đào tạo"),
  other: msg("Hoạt động đặc thù"),
};

const HEADCOUNT_LABELS: Record<string, string> = {
  "lt-10": msg("Dưới 10 người"),
  "10-49": msg("10 – 49 người"),
  "50-199": msg("50 – 199 người"),
  "200-499": msg("200 – 499 người"),
  "gte-500": msg("Từ 500 người"),
};

const SECTION_IDS = {
  energy: ["C-001", "C-004"],
  climate: ["C-005", "C-008"],
  water: ["C-010"],
  waste: ["C-014"],
  materials: ["C-015", "C-016", "C-017", "C-018"],
  targets: ["C-020"],
  workforce: ["C-023", "C-024", "C-025", "C-026"],
  safety: ["C-027", "C-028", "C-029", "C-032"],
  labour: ["C-033", "C-034", "C-035", "C-036"],
  community: ["C-038", "C-039", "C-040"],
  coordination: ["C-041", "C-042", "C-056", "C-057", "C-058", "C-059"],
  integrity: ["C-043", "C-044", "C-045"],
  supply: ["C-047", "C-048"],
  data: ["C-049", "C-050", "C-051", "C-052", "C-053", "C-054", "C-055"],
} as const;

const NO_EVIDENCE = "—";
const PRIORITY_HIGH = msg("Cao");
const PRIORITY_MEDIUM = msg("Trung bình");
const PRIORITY_CLARIFY = msg("Cần làm rõ trước");
const REASON_INCIDENT = msg("Có sự cố hoặc vụ việc được khai báo");
const REASON_NO = msg("Chưa có");
const REASON_PARTIAL = msg("Có một phần");
const REASON_UNKNOWN = msg("Chưa rõ");
const REASON_NO_DATA = msg("Chưa có dữ liệu");

function priorityOf(rank: number): string {
  if (rank <= 1) {
    return t(PRIORITY_HIGH);
  }
  return t(rank === 2 ? PRIORITY_MEDIUM : PRIORITY_CLARIFY);
}
const MAX_LISTED = 3;

function isIndustry(value: string): value is IndustryValue {
  return value in INDUSTRY_SOURCES;
}

function clean(value: string | undefined): string {
  return (value ?? "").trim();
}

function orNull(value: string | undefined): string | null {
  const text = clean(value);
  return text === "" ? null : text;
}

function joinSentences(parts: readonly (string | null)[]): string | null {
  const text = parts.filter((part): part is string => part !== null && part !== "").join(" ");
  return text === "" ? null : text;
}

function describeEvidence(question: Question, fileName: string): string {
  return [
    `${question.id} — ${labelFor(question)}`,
    t("Tệp: {fileName}", { fileName }),
    t("Minh chứng cho câu: {text}", { text: question.text }),
  ].join("\n");
}

function listLabels(labels: readonly string[]): string {
  return labels.join("; ");
}

interface Gap {
  readonly rank: number;
  readonly entry: Entry;
  readonly reason: string;
}

function buildEntries(survey: Survey): Entry[] {
  return survey.flatMap((pillar) =>
    pillar.groups.flatMap((group) =>
      group.questions.map((question) => ({
        question,
        pillarId: pillar.id,
        pillarName: pillar.name,
        groupTitle: group.title,
      })),
    ),
  );
}

function labelById(id: string): string | null {
  const known = REPORT_QUESTION_LABELS[id];
  return known === undefined ? null : t(known);
}

function labelFor(question: Question): string {
  return labelById(question.id) ?? (question.topic || question.text);
}

function rankGaps(
  entries: readonly Entry[],
  answers: Readonly<Record<string, ReportAnswerInput>>,
): Gap[] {
  const gaps: Gap[] = [];
  for (const entry of entries) {
    const { question } = entry;
    const value = (answers[question.id] ?? EMPTY_ANSWER).value;
    if (value === null || value === "na") {
      continue;
    }
    if (question.inputType === "INCIDENT" && value === "yes") {
      gaps.push({ rank: 0, entry, reason: REASON_INCIDENT });
    } else if (question.inputType === "PRACTICE" && value === "no") {
      gaps.push({ rank: 1, entry, reason: REASON_NO });
    } else if (question.inputType === "PRACTICE" && value === "partial") {
      gaps.push({ rank: 2, entry, reason: REASON_PARTIAL });
    } else if (question.inputType === "PRACTICE" && value === "unknown") {
      gaps.push({ rank: 3, entry, reason: REASON_UNKNOWN });
    } else if (
      question.inputType !== "PRACTICE" &&
      question.inputType !== "INCIDENT" &&
      question.inputType !== "PRESENCE" &&
      value === "unknown"
    ) {
      gaps.push({ rank: 4, entry, reason: REASON_NO_DATA });
    }
  }
  return gaps
    .map((gap, index) => ({ gap, index }))
    .sort((left, right) => left.gap.rank - right.gap.rank || left.index - right.index)
    .map(({ gap }) => gap);
}

function suggestionText(gap: Gap): string {
  const { question } = gap.entry;
  const hint = clean(question.improvementHint);
  if (gap.rank === 0) {
    return t("Rà soát tình trạng xử lý và biện pháp khắc phục: {label}", {
      label: labelFor(question),
    });
  }
  return hint !== "" ? hint : t("Rà soát và bổ sung: {label}", { label: labelFor(question) });
}

function toSuggestion(gap: Gap): ReportSuggestion {
  return {
    id: gap.entry.question.id,
    text: suggestionText(gap),
    basis: t("căn cứ {id}: {reason}", { id: gap.entry.question.id, reason: t(gap.reason) }),
    priority: priorityOf(gap.rank),
  };
}

export function listImprovementSuggestions(
  survey: Survey,
  answers: Readonly<Record<string, ReportAnswerInput>>,
  translate?: ReportTranslator,
): ReportSuggestion[] {
  return withTranslator(translate, () =>
    rankGaps(buildEntries(survey), answers).map(toSuggestion),
  );
}

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const NOT_PROVIDED = msg("Chưa cung cấp");

function formatDue(value: string): string {
  const text = value.trim();
  const match = ISO_DATE.exec(text);
  if (match === null) {
    return text === "" ? t(NOT_PROVIDED) : text;
  }
  return `${match[3]}/${match[2]}/${match[1]}`;
}

function toPlanStatus(value: string): PlanStatus {
  const found = PLAN_STATUSES.find((status) => status === value.trim());
  return found ?? PLAN_STATUSES[0];
}

function sortTasks(tasks: readonly PlanTaskInput[]): PlanTaskInput[] {
  return tasks
    .map((task, index) => ({ task, index }))
    .sort((left, right) => {
      const leftDue = ISO_DATE.test(left.task.due.trim()) ? left.task.due.trim() : null;
      const rightDue = ISO_DATE.test(right.task.due.trim()) ? right.task.due.trim() : null;
      if (leftDue !== null && rightDue !== null && leftDue !== rightDue) {
        return leftDue < rightDue ? -1 : 1;
      }
      if (leftDue === null && rightDue !== null) {
        return 1;
      }
      if (leftDue !== null && rightDue === null) {
        return -1;
      }
      return left.index - right.index;
    })
    .map(({ task }) => task);
}

export function buildReportModel(input: ReportBuildInput): ReportModel {
  return withTranslator(input.translate, () => buildModel(input));
}

function buildModel(input: ReportBuildInput): ReportModel {
  const { survey, company, answers } = input;

  const entries = buildEntries(survey);
  const lookup = new Map(entries.map((entry) => [entry.question.id, entry]));

  function draftOf(id: string): ReportAnswerInput {
    return answers[id] ?? EMPTY_ANSWER;
  }

  function labelOf(question: Question): string {
    return labelFor(question);
  }

  function answerText(question: Question, draft: ReportAnswerInput): string {
    if (draft.value === null) {
      return t("Chưa khai báo");
    }
    const choice = getChoiceLabel(question.inputType, draft.value);
    const label = choice === null ? draft.value : t(choice);
    const fields = getAnswerFields(question.inputType, draft.value);
    const note = clean(draft.description);
    const numeric = question.inputType === "NUMBER" || question.inputType === "INTEGER";
    if (numeric && fields.numberInput) {
      const unit = question.unit === "" ? "" : ` ${question.unit}`;
      return joinSentences([`${clean(draft.number)}${unit}`, note !== "" ? `(${note})` : null]) ?? label;
    }
    if (question.inputType === "TEXT" && draft.value === "provided") {
      return note;
    }
    if (
      (question.inputType === "FUEL_TABLE" || question.inputType === "WORKFORCE_TABLE") &&
      draft.value === "known"
    ) {
      return note;
    }
    return note !== "" ? `${label} — ${note}` : label;
  }

  function evidenceText(question: Question, draft: ReportAnswerInput): string {
    const fields = getAnswerFields(question.inputType, draft.value);
    if (!fields.evidence) {
      return NO_EVIDENCE;
    }
    return draft.evidence.length > 0
      ? t("Đã đính kèm {count} tệp; chưa xác minh", { count: draft.evidence.length })
      : t("Chưa đính kèm bằng chứng");
  }

  function item(id: string): ReportItem | null {
    const entry = lookup.get(id);
    if (entry === undefined) {
      return null;
    }
    const draft = draftOf(id);
    return {
      id,
      label: labelOf(entry.question),
      answer: answerText(entry.question, draft),
      evidence: evidenceText(entry.question, draft),
    };
  }

  function items(ids: readonly string[]): ReportItem[] {
    return ids.map(item).filter((value): value is ReportItem => value !== null);
  }

  function metric(id: string): ReportMetric | null {
    const entry = lookup.get(id);
    if (entry === undefined) {
      return null;
    }
    const { question } = entry;
    const draft = draftOf(id);
    const note = clean(draft.description);
    const numeric = question.inputType === "NUMBER" || question.inputType === "INTEGER";
    if (draft.value === null) {
      return { id, state: "empty", text: t("Chưa khai báo"), value: null, unit: question.unit, source: "" };
    }
    if (draft.value === "known" || draft.value === "provided") {
      return numeric
        ? {
            id,
            state: "known",
            text: clean(draft.number),
            value: parseQuantity(draft.number),
            unit: question.unit,
            source: note,
          }
        : { id, state: "known", text: note, value: null, unit: "", source: "" };
    }
    if (draft.value === "na") {
      return { id, state: "na", text: t("Không áp dụng"), value: null, unit: question.unit, source: note };
    }
    return { id, state: "unknown", text: t("Chưa có dữ liệu"), value: null, unit: question.unit, source: note };
  }

  function practiceCounts(ids: readonly string[]): PracticeCounts {
    let counts: PracticeCounts = { yes: 0, partial: 0, no: 0, unknown: 0, na: 0, unanswered: 0, total: 0 };
    for (const id of ids) {
      const entry = lookup.get(id);
      if (entry === undefined || entry.question.inputType !== "PRACTICE") {
        continue;
      }
      const value = draftOf(id).value;
      const key =
        value === "yes" || value === "partial" || value === "no" || value === "unknown" || value === "na"
          ? value
          : "unanswered";
      counts = { ...counts, [key]: counts[key] + 1, total: counts.total + 1 };
    }
    return counts;
  }

  function gapLabels(ids: readonly string[]): string[] {
    return ids
      .filter((id) => {
        const entry = lookup.get(id);
        const value = draftOf(id).value;
        return (
          entry !== undefined &&
          entry.question.inputType === "PRACTICE" &&
          (value === "no" || value === "partial" || value === "unknown")
        );
      })
      .map((id) => labelById(id) ?? id);
  }

  function practiceSentence(ids: readonly string[]): string | null {
    const counts = practiceCounts(ids);
    if (counts.total === 0) {
      return null;
    }
    const parts = [
      counts.yes > 0 ? t("{count} ở mức Có", { count: counts.yes }) : null,
      counts.partial > 0 ? t("{count} Có một phần", { count: counts.partial }) : null,
      counts.no > 0 ? t("{count} Chưa có", { count: counts.no }) : null,
      counts.unknown > 0 ? t("{count} Chưa rõ", { count: counts.unknown }) : null,
      counts.na > 0 ? t("{count} Không áp dụng", { count: counts.na }) : null,
      counts.unanswered > 0 ? t("{count} chưa khai báo", { count: counts.unanswered }) : null,
    ].filter((part): part is string => part !== null);
    const labels = gapLabels(ids);
    return joinSentences([
      t("Trong {total} nội dung thực hành của phần này: {parts}.", {
        total: counts.total,
        parts: parts.join(", "),
      }),
      labels.length > 0
        ? t("Cần bổ sung hoặc làm rõ: {labels}.", { labels: listLabels(labels) })
        : null,
    ]);
  }

  function section(ids: readonly string[], extra: readonly (string | null)[] = []): ReportSection {
    const sectionItems = items(ids);
    return {
      items: sectionItems,
      assessment: sectionItems.length === 0 && extra.every((part) => part === null)
        ? null
        : joinSentences([...extra, practiceSentence(ids)]),
    };
  }

  function quantity(m: ReportMetric | null): string | null {
    if (m === null || m.state !== "known") {
      return null;
    }
    const value = m.value !== null ? formatQuantity(m.value) : m.text;
    return `${value}${m.unit === "" ? "" : ` ${m.unit}`}`;
  }

  const headcount = metric("C-021");
  const headcountValue = headcount?.state === "known" ? headcount.value : null;

  function perPerson(m: ReportMetric | null, unit: string): string | null {
    if (m === null || m.state !== "known" || m.value === null) {
      return null;
    }
    if (headcountValue === null || headcountValue <= 0) {
      return null;
    }
    return t("Bình quân {value} {unit} cho mỗi người lao động, tính từ số liệu tự khai.", {
      value: formatQuantity(m.value / headcountValue),
      unit,
    });
  }

  function dataSentence(m: ReportMetric | null, name: string): string | null {
    if (m === null) {
      return null;
    }
    if (m.state === "known") {
      return t("{name} trong kỳ: {quantity} theo số liệu tự khai.", {
        name,
        quantity: quantity(m) ?? "",
      });
    }
    if (m.state === "unknown") {
      return t("{name}: chưa có dữ liệu; báo cáo không suy ra số liệu thay thế.", { name });
    }
    return null;
  }

  const industry = clean(company["industry"]);
  const industryLabel = isIndustry(industry) ? t(INDUSTRY_LABELS[industry]) : industry;
  const headcountBand = clean(company["headcount"]);
  const sizeBandKey = HEADCOUNT_LABELS[headcountBand];
  const sizeBand = sizeBandKey === undefined ? headcountBand : t(sizeBandKey);
  const disclosureLevel =
    headcountBand in HEADCOUNT_TIERS && HEADCOUNT_TIERS[headcountBand as keyof typeof HEADCOUNT_TIERS] === "extended"
      ? t("Mở rộng")
      : t("Cơ bản");
  const companyName = clean(company["name"]);
  const period = formatPeriodRange(clean(company["reportPeriod"]), clean(company["reportYear"]));
  const issuedAt = formatVietnamDate(input.generatedAt);

  const secondaryCodes = splitCodes(clean(company["secondarySectors"]));
  const secondarySectors =
    secondaryCodes.length === 0
      ? null
      : secondaryCodes.map((code) => (isIndustry(code) ? t(INDUSTRY_LABELS[code]) : code)).join("; ");
  const capabilityCodes = splitCodes(clean(company["capabilities"]));
  const capabilities =
    capabilityCodes.length === 0
      ? null
      : capabilityCodes.map((code) => t(findOptionLabel(CAPABILITY_OPTIONS, code))).join("; ");

  const presence = (value: string | undefined): string | null => {
    const code = clean(value);
    return code === "" ? null : t(findOptionLabel(PRESENCE_OPTIONS, code));
  };

  const sites = parseTableLines(clean(company["sites"]), 3)
    .filter((cells) => cells[0] !== "")
    .map((cells) => ({ name: cells[0] ?? "", scope: cells[1] ?? "", limit: cells[2] ?? "" }));
  const supplierGroups = parseTableLines(clean(company["supplierGroups"]), 3)
    .filter((cells) => cells[0] !== "")
    .map((cells) => ({ name: cells[0] ?? "", risk: cells[1] ?? "", response: cells[2] ?? "" }));
  const downstreamList = splitList(clean(company["downstreamGroups"]));
  const supplierNames = supplierGroups.map((group) => group.name);

  function splitList(text: string): string[] {
    return text
      .split(/[\n;]/)
      .map((part) => part.trim())
      .filter((part) => part !== "");
  }

  const revenue = clean(company["revenueBand"]);
  const activitiesText = orNull(company["activities"]);

  const practiceIds = entries
    .filter((entry) => entry.question.inputType === "PRACTICE")
    .map((entry) => entry.question.id);
  const practice = practiceCounts(practiceIds);

  let answeredCount = 0;
  let evidenceCount = 0;
  let openItemsCount = 0;
  const unanswered: string[] = [];
  for (const { question } of entries) {
    const draft = draftOf(question.id);
    if (draft.value === null) {
      unanswered.push(question.id);
      openItemsCount += 1;
      continue;
    }
    if (getAnswerIssues(question, draft).length === 0) {
      answeredCount += 1;
    } else {
      openItemsCount += 1;
    }
    if (getAnswerFields(question.inputType, draft.value).evidence) {
      evidenceCount += draft.evidence.length;
    }
    const isGap =
      question.inputType === "PRACTICE"
        ? draft.value === "no" || draft.value === "partial" || draft.value === "unknown"
        : question.inputType === "INCIDENT"
          ? false
          : draft.value === "unknown";
    if (isGap && getAnswerIssues(question, draft).length === 0) {
      openItemsCount += 1;
    }
  }

  const rankedGaps = rankGaps(entries, answers);
  const actionText = suggestionText;

  const priorities = rankedGaps.slice(0, MAX_LISTED).map(actionText);

  const plan = input.plan ?? EMPTY_PLAN;
  const planTasks = plan.tasks.filter((task) => clean(task.description) !== "");
  const confirmedIds = new Set(planTasks.map((task) => task.fromId).filter((id) => id !== ""));
  const actions: ReportAction[] = sortTasks(planTasks).map((task) => ({
    description: clean(task.description),
    owner: orNull(task.owner) ?? t(NOT_PROVIDED),
    due: formatDue(task.due),
    status: toPlanStatus(task.status),
  }));
  const suggestions: ReportSuggestion[] = rankedGaps
    .filter((gap) => !confirmedIds.has(gap.entry.question.id))
    .map(toSuggestion);

  const gapRows: ReportGap[] = [];
  const gapsByGroup = new Map<string, Gap[]>();
  for (const gap of rankedGaps) {
    const key = gap.entry.groupTitle;
    gapsByGroup.set(key, [...(gapsByGroup.get(key) ?? []), gap]);
  }
  for (const [title, list] of gapsByGroup) {
    const lineOf = (reason: string, heading: string): string | null => {
      const names = list
        .filter((gap) => gap.reason === reason)
        .map((gap) => labelOf(gap.entry.question));
      return names.length > 0 ? `${heading}: ${names.join("; ")}` : null;
    };
    const parts = [
      lineOf(REASON_INCIDENT, t("Sự cố được khai báo")),
      lineOf(REASON_NO, t(REASON_NO)),
      lineOf(REASON_PARTIAL, t(REASON_PARTIAL)),
      lineOf(REASON_UNKNOWN, t(REASON_UNKNOWN)),
      lineOf(REASON_NO_DATA, t(REASON_NO_DATA)),
    ].filter((part): part is string => part !== null);
    const topRank = Math.min(...list.map((gap) => gap.rank));
    gapRows.push({ title, reason: parts.join("\n"), priority: priorityOf(topRank) });
  }

  const topicCounts = new Map<string, number>();
  for (const gap of rankedGaps) {
    const topic = gap.entry.question.topic === "" ? t("Khác") : gap.entry.question.topic;
    topicCounts.set(topic, (topicCounts.get(topic) ?? 0) + 1);
  }
  const gapsByTopic: ChartDatum[] = [...topicCounts.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((left, right) => right.value - left.value);

  const envIncident = item("C-019");
  const integrityIncident = item("C-046");
  const incidentNotes = [
    envIncident !== null && draftOf("C-019").value === "yes"
      ? t("Có sự cố môi trường được khai báo trong kỳ.")
      : null,
    integrityIncident !== null && draftOf("C-046").value === "yes"
      ? t("Có vụ việc liêm chính được khai báo trong kỳ.")
      : null,
  ];

  const executiveSummary =
    joinSentences([
      t("{name} lập hồ sơ tự khai ESG cho kỳ {period}.", {
        name: companyName === "" ? t("Doanh nghiệp") : companyName,
        period,
      }),
      t("Hồ sơ ghi nhận {answered} nội dung khai báo hợp lệ trên {total} nội dung áp dụng.", {
        answered: answeredCount,
        total: entries.length,
      }),
      practice.total > 0
        ? practice.na > 0
          ? t(
              "Trong {total} câu thực hành: {yes} ở mức Có, {partial} Có một phần, {no} Chưa có, {unknown} Chưa rõ và {na} Không áp dụng.",
              {
                total: practice.total,
                yes: practice.yes,
                partial: practice.partial,
                no: practice.no,
                unknown: practice.unknown,
                na: practice.na,
              },
            )
          : t(
              "Trong {total} câu thực hành: {yes} ở mức Có, {partial} Có một phần, {no} Chưa có, {unknown} Chưa rõ.",
              {
                total: practice.total,
                yes: practice.yes,
                partial: practice.partial,
                no: practice.no,
                unknown: practice.unknown,
              },
            )
        : null,
      ...incidentNotes,
      evidenceCount > 0
        ? t("{count} tệp minh chứng được đính kèm; việc đính kèm chưa đồng nghĩa nội dung đã được xác minh.", {
            count: evidenceCount,
          })
        : t("Chưa có tệp minh chứng nào được đính kèm."),
      t("Thông tin là tự khai và chưa được xác minh độc lập."),
    ]) ?? "";

  const electricity = metric("C-002");
  const water = metric("C-009");
  const scope1 = metric("C-006");
  const scope2 = metric("C-007");
  const wasteNon = metric("C-012");
  const wasteHaz = metric("C-013");
  const trainingHours = metric("C-037");
  const accidents = metric("C-030");
  const fatalities = metric("C-031");

  const ghgKnown = [scope1, scope2].filter((m) => m !== null && m.state === "known");
  const ghgStatus =
    scope1 === null && scope2 === null
      ? null
      : ghgKnown.length === 2
        ? t("Đã khai báo Scope 1 và Scope 2")
        : ghgKnown.length === 1
          ? t("Khai báo một phần")
          : t("Chưa có dữ liệu");

  const energy = section(SECTION_IDS.energy, [
    dataSentence(electricity, t("Điện tiêu thụ")),
    perPerson(electricity, "kWh"),
  ]);
  const waterSection = section(SECTION_IDS.water, [
    dataSentence(water, t("Nước sử dụng")),
    perPerson(water, "m³"),
  ]);
  const waste = section(SECTION_IDS.waste, [
    dataSentence(wasteNon, t("Chất thải không nguy hại")),
    dataSentence(wasteHaz, t("Chất thải nguy hại")),
  ]);
  const climate = section(SECTION_IDS.climate, [
    dataSentence(scope1, t("Phát thải Scope 1")),
    dataSentence(scope2, t("Phát thải Scope 2 location-based")),
    scope1 !== null || scope2 !== null
      ? t("Số liệu phát thải là giá trị doanh nghiệp tự khai; báo cáo không tự tính hoặc suy ra lượng giảm phát thải.")
      : null,
  ]);
  const materials = section(SECTION_IDS.materials);
  const targets = section(SECTION_IDS.targets);

  const environmentIds = entries.filter((entry) => entry.pillarId === "E").map((entry) => entry.question.id);
  const environmentGapLabels = gapLabels(environmentIds);

  const safetyExtra = [
    accidents?.state === "known"
      ? fatalities?.state === "known"
        ? t(
            "Doanh nghiệp khai báo {accidents} tai nạn lao động trong phạm vi báo cáo và {fatalities} trường hợp tử vong liên quan công việc.",
            {
              accidents: quantity(accidents) ?? "",
              fatalities: fatalities.value !== null ? formatQuantity(fatalities.value) : fatalities.text,
            },
          )
        : t("Doanh nghiệp khai báo {accidents} tai nạn lao động trong phạm vi báo cáo.", {
            accidents: quantity(accidents) ?? "",
          })
      : accidents?.state === "unknown"
        ? t("Chưa có dữ liệu về tai nạn lao động; báo cáo không suy ra là không có tai nạn.")
        : null,
  ];

  const trainingSentence =
    trainingHours?.state === "known"
      ? joinSentences([
          t("Tổng thời lượng đào tạo khai báo: {quantity}.", { quantity: quantity(trainingHours) ?? "" }),
          perPerson(trainingHours, t("giờ")),
        ])
      : null;

  const workforceExtra =
    headcount?.state === "known"
      ? [t("Số người lao động cuối kỳ: {quantity}.", { quantity: quantity(headcount) ?? "" })]
      : [];

  const coordinationItems = items(SECTION_IDS.coordination);
  const esgRole = orNull(answers["C-041"]?.description);
  const leadership = orNull(answers["C-059"]?.description);

  const activeSources = new Set(entries.map((entry) => entry.question.source));
  const moduleOrder = Object.values(INDUSTRY_SOURCES);
  const modules: ReportModule[] = [];
  for (const source of moduleOrder) {
    if (!activeSources.has(source)) {
      continue;
    }
    const ids = entries.filter((entry) => entry.question.source === source).map((entry) => entry.question.id);
    const industryKey = (Object.keys(INDUSTRY_SOURCES) as IndustryValue[]).find(
      (key) => INDUSTRY_SOURCES[key] === source,
    );
    const title = industryKey === undefined ? source : t(INDUSTRY_LABELS[industryKey]);
    modules.push({
      source,
      title,
      scope: [title, capabilities].filter((part) => part !== null).join("; "),
      limits: orNull(company["reportScope"]),
      items: items(ids),
      assessment: practiceSentence(ids),
    });
  }

  const missingEvidence = practiceIds.filter((id) => {
    if (id === "C-060") {
      return false;
    }
    const value = draftOf(id).value;
    return (value === "yes" || value === "partial") && draftOf(id).evidence.length === 0;
  });
  const followups =
    missingEvidence.length > 0
      ? [
          t("Bổ sung hoặc đối chiếu căn cứ cho:"),
          ...missingEvidence.map((id) => `• ${labelById(id) ?? id}`),
        ].join("\n")
      : null;
  const focusLabels = rankedGaps.slice(0, MAX_LISTED).map((gap) => labelOf(gap.entry.question));
  const focus =
    focusLabels.length > 0 ? t("Tập trung xem xét: {labels}.", { labels: focusLabels.join("; ") }) : null;

  const evidenceRows: ReportEvidenceRow[] = [];
  const evidenceGroups: ReportEvidenceGroup[] = [];
  const appendixRows: ReportAppendixRow[] = [];
  for (const { question } of entries) {
    const draft = draftOf(question.id);
    appendixRows.push({
      id: question.id,
      question: question.text,
      answer: answerText(question, draft),
      evidence: evidenceText(question, draft),
    });
    if (getAnswerFields(question.inputType, draft.value).evidence) {
      const files: { code: string; name: string }[] = [];
      for (const file of draft.evidence) {
        const code = `EV-${String(evidenceRows.length + 1).padStart(3, "0")}`;
        evidenceRows.push({
          id: code,
          description: describeEvidence(question, file.name),
          scope: period,
          status: t("Đã đính kèm; chưa xác minh"),
        });
        files.push({ code, name: file.name });
      }
      if (files.length > 0) {
        evidenceGroups.push({
          questionId: question.id,
          label: labelOf(question),
          text: question.text,
          note: orNull(draft.description),
          files,
        });
      }
    }
  }

  const unansweredSummary =
    unanswered.length === 0
      ? null
      : t("{count} nội dung chưa khai báo: {ids}.", {
          count: unanswered.length,
          ids: unanswered.join(", "),
        });

  const confirmed = draftOf("C-060").value === "yes";
  const reportId = input.reportCode ?? t("Chưa lưu hồ sơ");

  const limitationParts = [
    orNull(company["dataLimitations"]),
    t("Số liệu và thực hành do doanh nghiệp tự cung cấp; chưa có xác minh độc lập."),
    unanswered.length > 0
      ? t("{count} nội dung trong phạm vi chưa được khai báo.", { count: unanswered.length })
      : null,
  ];

  const profileContext = joinSentences([
    secondarySectors !== null
      ? t(
          "{name} thuộc nhóm quy mô {sizeBand}, hoạt động chính trong lĩnh vực {industry}, kèm ngành bổ sung {sectors}.",
          {
            name: companyName === "" ? t("Doanh nghiệp") : companyName,
            sizeBand,
            industry: industryLabel,
            sectors: secondarySectors,
          },
        )
      : t("{name} thuộc nhóm quy mô {sizeBand}, hoạt động chính trong lĩnh vực {industry}.", {
          name: companyName === "" ? t("Doanh nghiệp") : companyName,
          sizeBand,
          industry: industryLabel,
        }),
    activitiesText,
  ]) ?? "";

  return {
    meta: {
      companyName,
      tradingName: orNull(company["tradingName"]),
      registrationId: orNull(company["taxCode"]),
      legalForm: orNull(company["legalForm"]),
      period,
      reportId,
      status: input.isDraft ? t("BẢN NHÁP") : t("HOÀN TẤT TỰ KHAI"),
      isDraft: input.isDraft,
      issuedAt,
      disclosureLevel,
      contentVersion: input.contentVersion,
      answerVersion: formatVersionStamp(input.generatedAt),
      reportVersion: input.isDraft ? t("Bản nháp") : "1.0",
      reviewStatus: confirmed
        ? t("Doanh nghiệp đã xác nhận thông tin; chưa rà soát độc lập")
        : t("Chưa xác nhận; chưa rà soát độc lập"),
      countries: orNull(company["countries"]),
      reportReference: `${reportId} • ESG Report Online`,
    },
    summary: {
      answeredCount,
      evidenceCount,
      openItemsCount,
      executiveSummary,
      priorities,
      practice,
    },
    profile: {
      primarySector: industryLabel,
      secondarySectors,
      sizeBand,
      activities: activitiesText,
      orgContext: profileContext,
      capabilities,
      employeesPresence: presence(company["hasEmployees"]),
      contractorPresence: presence(company["hasContractors"]),
      sites,
      scopeLimitations: joinSentences([orNull(company["reportScope"]), orNull(company["dataLimitations"])]),
      products: activitiesText,
      markets: orNull(company["markets"]),
      revenueBand: revenue === "" ? null : t(findOptionLabel(REVENUE_BANDS, revenue)),
      supplierGroupsText: supplierNames.length > 0 ? supplierNames.join("; ") : null,
      downstreamGroupsText: downstreamList.length > 0 ? downstreamList.join("; ") : null,
      supplierGroups,
      valueChainContext:
        supplierNames.length > 0 || downstreamList.length > 0
          ? joinSentences([
              supplierNames.length > 0
                ? t("Nhóm nhà cung cấp được nêu: {names}.", { names: supplierNames.join("; ") })
                : null,
              downstreamList.length > 0
                ? t("Nhóm đối tác đầu ra: {names}.", { names: downstreamList.join("; ") })
                : null,
              t("Báo cáo chưa đánh giá tác động tại nhà cung cấp hoặc đối tác nếu hồ sơ không có số liệu tương ứng."),
            ])
          : null,
    },
    environment: {
      electricity,
      water,
      ghgStatus,
      overviewAssessment: joinSentences([
        dataSentence(electricity, t("Điện tiêu thụ")),
        dataSentence(water, t("Nước sử dụng")),
        practiceSentence(environmentIds),
      ]),
      overviewGaps:
        environmentGapLabels.length > 0
          ? t("Cần làm rõ: {labels}.", { labels: environmentGapLabels.join("; ") })
          : null,
      energy,
      fuel: metric("C-003"),
      climate,
      scope1,
      scope2,
      ghgMethod: orNull(answers["C-005"]?.description),
      ghgSources: joinSentences([orNull(answers["C-006"]?.description), orNull(answers["C-007"]?.description)]),
      waterSection,
      wastewater: metric("C-011"),
      waste,
      wasteNonHazardous: wasteNon,
      wasteHazardous: wasteHaz,
      materials,
      incident: envIncident,
      targets,
    },
    social: {
      headcount,
      workerScope: orNull(answers["C-021"]?.description),
      workforceTable: metric("C-022"),
      workforce: section(SECTION_IDS.workforce, workforceExtra),
      accidents,
      fatalities,
      safety: section(SECTION_IDS.safety, safetyExtra),
      labour: section(SECTION_IDS.labour),
      trainingHours,
      community: section(SECTION_IDS.community, [trainingSentence]),
    },
    governance: {
      esgRole,
      leadershipReview: leadership,
      coordination: {
        items: coordinationItems,
        assessment: practiceSentence(SECTION_IDS.coordination),
      },
      priorities: orNull(answers["C-057"]?.description),
      integrity: section(SECTION_IDS.integrity),
      integrityIncident,
      supply: section(SECTION_IDS.supply),
      data: section(SECTION_IDS.data),
    },
    modules,
    improvement: {
      gaps: gapRows,
      followups,
      focus,
      actions,
      suggestions,
      goal: orNull(plan.goal),
      resources: orNull(plan.resources),
      reviewCycle: orNull(plan.reviewCycle),
    },
    evidence: {
      rows: evidenceRows,
      groups: evidenceGroups,
      limitations: joinSentences(limitationParts) ?? "",
      permittedReferences: input.contentVersion,
      verificationStatement:
        t("Không có xác minh độc lập, chứng nhận, chữ ký số hoặc dấu xác nhận của tổ chức bên ngoài."),
    },
    appendix: { rows: appendixRows, unansweredSummary },
    confirmation: {
      role: orNull(company["confirmingRole"]),
      confirmedAt: confirmed ? issuedAt : null,
      status: confirmed
        ? t("Doanh nghiệp đã xác nhận thông tin; không có xác nhận pháp lý")
        : t("Chưa xác nhận"),
    },
    charts: {
      practiceStatus: [
        { label: t("Có"), value: practice.yes },
        { label: t("Có một phần"), value: practice.partial },
        { label: t("Chưa có"), value: practice.no },
        { label: t("Chưa rõ"), value: practice.unknown },
        { label: t("Không áp dụng"), value: practice.na },
      ],
      pillarStatus: survey.map((pillar) => {
        const ids = pillar.groups.flatMap((group) => group.questions.map((question) => question.id));
        const counts = practiceCounts(ids);
        return { label: pillar.name, yes: counts.yes, partial: counts.partial, gap: counts.no + counts.unknown };
      }),
      ghg: [
        scope1?.state === "known" && scope1.value !== null ? { label: "Scope 1", value: scope1.value } : null,
        scope2?.state === "known" && scope2.value !== null ? { label: "Scope 2", value: scope2.value } : null,
      ].filter((datum): datum is ChartDatum => datum !== null),
      waste: [
        wasteNon?.state === "known" && wasteNon.value !== null
          ? { label: t("Không nguy hại"), value: wasteNon.value }
          : null,
        wasteHaz?.state === "known" && wasteHaz.value !== null
          ? { label: t("Nguy hại"), value: wasteHaz.value }
          : null,
      ].filter((datum): datum is ChartDatum => datum !== null),
      gapsByTopic,
      supplyChain:
        supplierNames.length > 0 || downstreamList.length > 0
          ? { suppliers: supplierNames, downstream: downstreamList }
          : null,
    },
  };
}
