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
import { REPORT_QUESTION_LABELS } from "./report-labels";
import {
  CAPABILITY_OPTIONS,
  PRESENCE_OPTIONS,
  REVENUE_BANDS,
  findOptionLabel,
  parseTableLines,
  splitCodes,
} from "./profile";
import type {
  ChartDatum,
  PracticeCounts,
  ReportAction,
  ReportAnswerInput,
  ReportAppendixRow,
  ReportEvidenceRow,
  ReportGap,
  ReportItem,
  ReportMetric,
  ReportModel,
  ReportModule,
  ReportSection,
} from "./report-types";
import type { Question, Survey } from "./survey";

export interface ReportBuildInput {
  readonly survey: Survey;
  readonly company: Readonly<Record<string, string>>;
  readonly answers: Readonly<Record<string, ReportAnswerInput>>;
  readonly reportCode: string | null;
  readonly generatedAt: string;
  readonly contentVersion: string;
  readonly isDraft: boolean;
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
  manufacturing: "Sản xuất",
  retail: "Thương mại và bán lẻ",
  services: "Dịch vụ",
  it: "Công nghệ thông tin",
  construction: "Xây dựng và bất động sản",
  agriculture: "Nông nghiệp và thực phẩm",
  education: "Giáo dục và đào tạo",
  other: "Hoạt động đặc thù",
};

const HEADCOUNT_LABELS: Record<string, string> = {
  "lt-10": "Dưới 10 người",
  "10-49": "10 – 49 người",
  "50-199": "50 – 199 người",
  "200-499": "200 – 499 người",
  "gte-500": "Từ 500 người",
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
const PENDING_PRIORITY = "Chờ người có thẩm quyền lựa chọn";
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

const MAX_NOTE_LENGTH = 160;

function describeEvidence(
  question: Question,
  draft: ReportAnswerInput,
  fileName: string,
): string {
  const note = clean(draft.description);
  const shortNote =
    note.length > MAX_NOTE_LENGTH ? `${note.slice(0, MAX_NOTE_LENGTH)}…` : note;
  return [
    `${question.id} — ${REPORT_QUESTION_LABELS[question.id] ?? (question.topic || question.text)}`,
    `Tệp: ${fileName}`,
    `Minh chứng cho câu: ${question.text}`,
    shortNote !== "" ? `Ghi chú của doanh nghiệp: ${shortNote}` : null,
  ]
    .filter((line): line is string => line !== null)
    .join("\n");
}

function listLabels(labels: readonly string[]): string {
  return labels.join("; ");
}

export function buildReportModel(input: ReportBuildInput): ReportModel {
  const { survey, company, answers } = input;

  const entries: Entry[] = survey.flatMap((pillar) =>
    pillar.groups.flatMap((group) =>
      group.questions.map((question) => ({
        question,
        pillarId: pillar.id,
        pillarName: pillar.name,
        groupTitle: group.title,
      })),
    ),
  );
  const lookup = new Map(entries.map((entry) => [entry.question.id, entry]));

  function draftOf(id: string): ReportAnswerInput {
    return answers[id] ?? EMPTY_ANSWER;
  }

  function labelOf(question: Question): string {
    return REPORT_QUESTION_LABELS[question.id] ?? (question.topic || question.text);
  }

  function answerText(question: Question, draft: ReportAnswerInput): string {
    if (draft.value === null) {
      return "Chưa khai báo";
    }
    const label = getChoiceLabel(question.inputType, draft.value) ?? draft.value;
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
      ? `Đã đính kèm ${draft.evidence.length} tệp; chưa xác minh`
      : "Chưa đính kèm bằng chứng";
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
      return { id, state: "empty", text: "Chưa khai báo", value: null, unit: question.unit, source: "" };
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
      return { id, state: "na", text: "Không áp dụng", value: null, unit: question.unit, source: note };
    }
    return { id, state: "unknown", text: "Chưa có dữ liệu", value: null, unit: question.unit, source: note };
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
      .map((id) => REPORT_QUESTION_LABELS[id] ?? id);
  }

  function practiceSentence(ids: readonly string[]): string | null {
    const counts = practiceCounts(ids);
    if (counts.total === 0) {
      return null;
    }
    const parts = [
      counts.yes > 0 ? `${counts.yes} ở mức Có` : null,
      counts.partial > 0 ? `${counts.partial} Có một phần` : null,
      counts.no > 0 ? `${counts.no} Chưa có` : null,
      counts.unknown > 0 ? `${counts.unknown} Chưa rõ` : null,
      counts.na > 0 ? `${counts.na} Không áp dụng` : null,
      counts.unanswered > 0 ? `${counts.unanswered} chưa khai báo` : null,
    ].filter((part): part is string => part !== null);
    const labels = gapLabels(ids);
    return joinSentences([
      `Trong ${counts.total} nội dung thực hành của phần này: ${parts.join(", ")}.`,
      labels.length > 0 ? `Cần bổ sung hoặc làm rõ: ${listLabels(labels)}.` : null,
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
    return `Bình quân ${formatQuantity(m.value / headcountValue)} ${unit} cho mỗi người lao động, tính từ số liệu tự khai.`;
  }

  function dataSentence(m: ReportMetric | null, name: string): string | null {
    if (m === null) {
      return null;
    }
    if (m.state === "known") {
      return `${name} trong kỳ: ${quantity(m)} theo số liệu tự khai.`;
    }
    if (m.state === "unknown") {
      return `${name}: chưa có dữ liệu; báo cáo không suy ra số liệu thay thế.`;
    }
    return null;
  }

  const industry = clean(company["industry"]);
  const industryLabel = isIndustry(industry) ? INDUSTRY_LABELS[industry] : industry;
  const headcountBand = clean(company["headcount"]);
  const sizeBand = HEADCOUNT_LABELS[headcountBand] ?? headcountBand;
  const disclosureLevel =
    headcountBand in HEADCOUNT_TIERS && HEADCOUNT_TIERS[headcountBand as keyof typeof HEADCOUNT_TIERS] === "extended"
      ? "Mở rộng"
      : "Cơ bản";
  const companyName = clean(company["name"]);
  const period = formatPeriodRange(clean(company["reportPeriod"]), clean(company["reportYear"]));
  const issuedAt = formatVietnamDate(input.generatedAt);

  const secondaryCodes = splitCodes(clean(company["secondarySectors"]));
  const secondarySectors =
    secondaryCodes.length === 0
      ? null
      : secondaryCodes.map((code) => (isIndustry(code) ? INDUSTRY_LABELS[code] : code)).join("; ");
  const capabilityCodes = splitCodes(clean(company["capabilities"]));
  const capabilities =
    capabilityCodes.length === 0
      ? null
      : capabilityCodes.map((code) => findOptionLabel(CAPABILITY_OPTIONS, code)).join("; ");

  const presence = (value: string | undefined): string | null => {
    const code = clean(value);
    return code === "" ? null : findOptionLabel(PRESENCE_OPTIONS, code);
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

  interface Gap {
    readonly rank: number;
    readonly entry: Entry;
    readonly reason: string;
  }
  const gaps: Gap[] = [];
  for (const entry of entries) {
    const { question } = entry;
    const value = draftOf(question.id).value;
    if (value === null || value === "na") {
      continue;
    }
    if (question.inputType === "INCIDENT" && value === "yes") {
      gaps.push({ rank: 0, entry, reason: "Có sự cố hoặc vụ việc được khai báo" });
    } else if (question.inputType === "PRACTICE" && value === "no") {
      gaps.push({ rank: 1, entry, reason: "Chưa có" });
    } else if (question.inputType === "PRACTICE" && value === "partial") {
      gaps.push({ rank: 2, entry, reason: "Có một phần" });
    } else if (question.inputType === "PRACTICE" && value === "unknown") {
      gaps.push({ rank: 3, entry, reason: "Chưa rõ" });
    } else if (
      question.inputType !== "PRACTICE" &&
      question.inputType !== "INCIDENT" &&
      question.inputType !== "PRESENCE" &&
      value === "unknown"
    ) {
      gaps.push({ rank: 4, entry, reason: "Chưa có dữ liệu" });
    }
  }
  const rankedGaps = gaps
    .map((gap, index) => ({ gap, index }))
    .sort((left, right) => left.gap.rank - right.gap.rank || left.index - right.index)
    .map(({ gap }) => gap);

  function actionText(gap: Gap): string {
    const { question } = gap.entry;
    const hint = clean(question.improvementHint);
    if (gap.rank === 0) {
      return `Rà soát tình trạng xử lý và biện pháp khắc phục: ${labelOf(question)}`;
    }
    return hint !== "" ? hint : `Rà soát và bổ sung: ${labelOf(question)}`;
  }

  const priorities = rankedGaps.slice(0, MAX_LISTED).map(actionText);

  const actions: ReportAction[] = rankedGaps.map((gap) => ({
    description: `${actionText(gap)} (căn cứ ${gap.entry.question.id}: ${gap.reason})`,
    owner: "Chưa phân công",
    due: "Chưa xác định",
    status: "Gợi ý, chưa xác nhận",
  }));

  const gapRows: ReportGap[] = [];
  const gapsByGroup = new Map<string, Gap[]>();
  for (const gap of rankedGaps) {
    const key = gap.entry.groupTitle;
    gapsByGroup.set(key, [...(gapsByGroup.get(key) ?? []), gap]);
  }
  for (const [title, list] of gapsByGroup) {
    const count = (reason: string) => list.filter((gap) => gap.reason === reason).length;
    const parts = [
      count("Có sự cố hoặc vụ việc được khai báo") > 0
        ? `${count("Có sự cố hoặc vụ việc được khai báo")} sự cố được khai báo`
        : null,
      count("Chưa có") > 0 ? `${count("Chưa có")} nội dung chưa có` : null,
      count("Có một phần") > 0 ? `${count("Có một phần")} nội dung có một phần` : null,
      count("Chưa rõ") > 0 ? `${count("Chưa rõ")} nội dung chưa rõ` : null,
      count("Chưa có dữ liệu") > 0 ? `${count("Chưa có dữ liệu")} số liệu chưa có` : null,
    ].filter((part): part is string => part !== null);
    gapRows.push({ title, reason: parts.join("; "), priority: PENDING_PRIORITY });
  }

  const topicCounts = new Map<string, number>();
  for (const gap of rankedGaps) {
    const topic = gap.entry.question.topic === "" ? "Khác" : gap.entry.question.topic;
    topicCounts.set(topic, (topicCounts.get(topic) ?? 0) + 1);
  }
  const gapsByTopic: ChartDatum[] = [...topicCounts.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((left, right) => right.value - left.value);

  const envIncident = item("C-019");
  const integrityIncident = item("C-046");
  const incidentNotes = [
    envIncident !== null && draftOf("C-019").value === "yes"
      ? "Có sự cố môi trường được khai báo trong kỳ."
      : null,
    integrityIncident !== null && draftOf("C-046").value === "yes"
      ? "Có vụ việc liêm chính được khai báo trong kỳ."
      : null,
  ];

  const executiveSummary =
    joinSentences([
      `${companyName === "" ? "Doanh nghiệp" : companyName} lập hồ sơ tự khai ESG cho kỳ ${period}.`,
      `Hồ sơ ghi nhận ${answeredCount} nội dung khai báo hợp lệ trên ${entries.length} nội dung áp dụng.`,
      practice.total > 0
        ? `Trong ${practice.total} câu thực hành: ${practice.yes} ở mức Có, ${practice.partial} Có một phần, ${practice.no} Chưa có, ${practice.unknown} Chưa rõ${practice.na > 0 ? ` và ${practice.na} Không áp dụng` : ""}.`
        : null,
      ...incidentNotes,
      evidenceCount > 0
        ? `${evidenceCount} tệp minh chứng được đính kèm; việc đính kèm chưa đồng nghĩa nội dung đã được xác minh.`
        : "Chưa có tệp minh chứng nào được đính kèm.",
      "Thông tin là tự khai và chưa được xác minh độc lập.",
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
        ? "Đã khai báo Scope 1 và Scope 2"
        : ghgKnown.length === 1
          ? "Khai báo một phần"
          : "Chưa có dữ liệu";

  const energy = section(SECTION_IDS.energy, [
    dataSentence(electricity, "Điện tiêu thụ"),
    perPerson(electricity, "kWh"),
  ]);
  const waterSection = section(SECTION_IDS.water, [
    dataSentence(water, "Nước sử dụng"),
    perPerson(water, "m³"),
  ]);
  const waste = section(SECTION_IDS.waste, [
    dataSentence(wasteNon, "Chất thải không nguy hại"),
    dataSentence(wasteHaz, "Chất thải nguy hại"),
  ]);
  const climate = section(SECTION_IDS.climate, [
    dataSentence(scope1, "Phát thải Scope 1"),
    dataSentence(scope2, "Phát thải Scope 2 location-based"),
    scope1 !== null || scope2 !== null
      ? "Số liệu phát thải là giá trị doanh nghiệp tự khai; báo cáo không tự tính hoặc suy ra lượng giảm phát thải."
      : null,
  ]);
  const materials = section(SECTION_IDS.materials);
  const targets = section(SECTION_IDS.targets);

  const environmentIds = entries.filter((entry) => entry.pillarId === "E").map((entry) => entry.question.id);
  const environmentGapLabels = gapLabels(environmentIds);

  const safetyExtra = [
    accidents?.state === "known"
      ? `Doanh nghiệp khai báo ${quantity(accidents)} tai nạn lao động trong phạm vi báo cáo${
          fatalities?.state === "known" ? ` và ${fatalities.value !== null ? formatQuantity(fatalities.value) : fatalities.text} trường hợp tử vong liên quan công việc` : ""
        }.`
      : accidents?.state === "unknown"
        ? "Chưa có dữ liệu về tai nạn lao động; báo cáo không suy ra là không có tai nạn."
        : null,
  ];

  const trainingSentence =
    trainingHours?.state === "known"
      ? joinSentences([
          `Tổng thời lượng đào tạo khai báo: ${quantity(trainingHours)}.`,
          perPerson(trainingHours, "giờ"),
        ])
      : null;

  const workforceExtra =
    headcount?.state === "known" ? [`Số người lao động cuối kỳ: ${quantity(headcount)}.`] : [];

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
    const title = industryKey === undefined ? source : INDUSTRY_LABELS[industryKey];
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
      ? `Bổ sung hoặc đối chiếu căn cứ cho: ${missingEvidence
          .map((id) => REPORT_QUESTION_LABELS[id] ?? id)
          .join("; ")}.`
      : null;
  const focusLabels = rankedGaps.slice(0, MAX_LISTED).map((gap) => labelOf(gap.entry.question));
  const focus = focusLabels.length > 0 ? `Tập trung xem xét: ${focusLabels.join("; ")}.` : null;

  const evidenceRows: ReportEvidenceRow[] = [];
  const appendixRows: ReportAppendixRow[] = [];
  for (const { question } of entries) {
    const draft = draftOf(question.id);
    appendixRows.push({
      id: question.id,
      text: `${question.text} — ${answerText(question, draft)}`,
      evidence: evidenceText(question, draft),
    });
    if (getAnswerFields(question.inputType, draft.value).evidence) {
      for (const file of draft.evidence) {
        evidenceRows.push({
          id: `EV-${String(evidenceRows.length + 1).padStart(3, "0")}`,
          description: describeEvidence(question, draft, file.name),
          scope: period,
          status: "Đã đính kèm; chưa xác minh",
        });
      }
    }
  }

  const unansweredSummary =
    unanswered.length === 0
      ? null
      : `${unanswered.length} nội dung chưa khai báo: ${unanswered.join(", ")}.`;

  const confirmed = draftOf("C-060").value === "yes";
  const reportId = input.reportCode ?? "Chưa lưu hồ sơ";

  const limitationParts = [
    orNull(company["dataLimitations"]),
    "Số liệu và thực hành do doanh nghiệp tự cung cấp; chưa có xác minh độc lập.",
    unanswered.length > 0 ? `${unanswered.length} nội dung trong phạm vi chưa được khai báo.` : null,
  ];

  const profileContext = joinSentences([
    `${companyName === "" ? "Doanh nghiệp" : companyName} thuộc nhóm quy mô ${sizeBand}, hoạt động chính trong lĩnh vực ${industryLabel}${
      secondarySectors !== null ? `, kèm ngành bổ sung ${secondarySectors}` : ""
    }.`,
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
      status: input.isDraft ? "BẢN NHÁP" : "HOÀN TẤT TỰ KHAI",
      isDraft: input.isDraft,
      issuedAt,
      disclosureLevel,
      contentVersion: input.contentVersion,
      answerVersion: formatVersionStamp(input.generatedAt),
      reportVersion: input.isDraft ? "Bản nháp" : "1.0",
      reviewStatus: confirmed
        ? "Doanh nghiệp đã xác nhận thông tin; chưa rà soát độc lập"
        : "Chưa xác nhận; chưa rà soát độc lập",
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
      revenueBand: revenue === "" ? null : findOptionLabel(REVENUE_BANDS, revenue),
      supplierGroupsText: supplierNames.length > 0 ? supplierNames.join("; ") : null,
      downstreamGroupsText: downstreamList.length > 0 ? downstreamList.join("; ") : null,
      supplierGroups,
      valueChainContext:
        supplierNames.length > 0 || downstreamList.length > 0
          ? joinSentences([
              supplierNames.length > 0 ? `Nhóm nhà cung cấp được nêu: ${supplierNames.join("; ")}.` : null,
              downstreamList.length > 0 ? `Nhóm đối tác đầu ra: ${downstreamList.join("; ")}.` : null,
              "Báo cáo chưa đánh giá tác động tại nhà cung cấp hoặc đối tác nếu hồ sơ không có số liệu tương ứng.",
            ])
          : null,
    },
    environment: {
      electricity,
      water,
      ghgStatus,
      overviewAssessment: joinSentences([
        dataSentence(electricity, "Điện tiêu thụ"),
        dataSentence(water, "Nước sử dụng"),
        practiceSentence(environmentIds),
      ]),
      overviewGaps:
        environmentGapLabels.length > 0 ? `Cần làm rõ: ${environmentGapLabels.join("; ")}.` : null,
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
      goal: orNull(answers["C-058"]?.description),
      resources: null,
      reviewCycle: leadership,
    },
    evidence: {
      rows: evidenceRows,
      limitations: joinSentences(limitationParts) ?? "",
      permittedReferences: input.contentVersion,
      verificationStatement:
        "Không có xác minh độc lập, chứng nhận, chữ ký số hoặc dấu xác nhận của tổ chức bên ngoài.",
    },
    appendix: { rows: appendixRows, unansweredSummary },
    confirmation: {
      role: orNull(company["confirmingRole"]),
      confirmedAt: confirmed ? issuedAt : null,
      status: confirmed
        ? "Doanh nghiệp đã xác nhận thông tin; không có xác nhận pháp lý"
        : "Chưa xác nhận",
    },
    charts: {
      practiceStatus: [
        { label: "Có", value: practice.yes },
        { label: "Có một phần", value: practice.partial },
        { label: "Chưa có", value: practice.no },
        { label: "Chưa rõ", value: practice.unknown },
        { label: "Không áp dụng", value: practice.na },
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
          ? { label: "Không nguy hại", value: wasteNon.value }
          : null,
        wasteHaz?.state === "known" && wasteHaz.value !== null
          ? { label: "Nguy hại", value: wasteHaz.value }
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
