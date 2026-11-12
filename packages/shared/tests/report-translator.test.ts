import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildReportModel, listImprovementSuggestions } from "../src/report-model";
import { identityTranslator } from "../src/report-text";
import type { ReportTranslator } from "../src/report-text";
import type { ReportAnswerInput } from "../src/report-types";
import type { Question, Survey } from "../src/survey";

function q(id: string, inputType: Question["inputType"], extra: Partial<Question> = {}): Question {
  return {
    id,
    groupId: "g",
    order: 0,
    text: `Câu ${id}`,
    topic: "Chủ đề",
    source: "COMMON",
    tier: "basic",
    inputType,
    unit: inputType === "NUMBER" ? "kWh" : "",
    required: true,
    improvementHint: "",
    guidance: { title: "", body: "", suggestedEvidence: "", tip: "" },
    ...extra,
  };
}

const survey: Survey = [
  {
    id: "E",
    name: "Môi trường",
    icon: "sprout",
    order: 1,
    groups: [
      {
        id: "g",
        pillarId: "E",
        order: 1,
        title: "Năng lượng",
        description: "",
        questions: [q("C-001", "PRACTICE"), q("C-004", "PRACTICE"), q("C-002", "NUMBER"), q("C-009", "NUMBER")],
      },
    ],
  },
];

function a(value: string | null, number = "", description = ""): ReportAnswerInput {
  return { value, number, description, evidence: [] };
}

const answers: Record<string, ReportAnswerInput> = {
  "C-001": a("yes"),
  "C-004": a("no"),
  "C-002": a("known", "100", "Hóa đơn"),
  "C-009": a("unknown"),
};

const dictionary: Record<string, string> = {
  "Chưa khai báo": "Not declared",
  "Cao": "High",
  "Chưa có": "None yet",
  "{name} trong kỳ: {quantity} theo số liệu tự khai.": "{name} in the period: {quantity} (self-declared).",
  "Điện tiêu thụ": "Electricity use",
  "Hồ sơ ghi nhận {answered} nội dung khai báo hợp lệ trên {total} nội dung áp dụng.":
    "The file records {answered} valid items out of {total} applicable items.",
};

const english: ReportTranslator = (text, vars) => identityTranslator(dictionary[text] ?? text, vars);

function build(translate?: ReportTranslator) {
  return buildReportModel({
    survey,
    company: { name: "ABC", industry: "it", headcount: "10-49", reportPeriod: "full_year", reportYear: "2025" },
    answers,
    reportCode: "ESG-1",
    generatedAt: "2026-11-03T02:30:00.000Z",
    contentVersion: "v1",
    isDraft: false,
    ...(translate ? { translate } : {}),
  });
}

describe("report translator", () => {
  it("giữ nguyên tiếng Việt khi không truyền translate", () => {
    const model = build();
    assert.equal(model.social.headcount, null);
    assert.equal(model.environment.water?.text, "Chưa có dữ liệu");
    assert.equal(model.meta.status, "HOÀN TẤT TỰ KHAI");
    assert.equal(model.profile.primarySector, "Công nghệ thông tin");
    assert.deepEqual(JSON.parse(JSON.stringify(build(identityTranslator))), JSON.parse(JSON.stringify(model)));
  });

  it("áp dụng translator cho nhãn và câu", () => {
    const model = build(english);
    assert.equal(model.improvement.suggestions[0]?.priority, "High");
    assert.match(model.improvement.gaps[0]?.reason ?? "", /^None yet: /);
  });

  it("thay biến trong câu đã dịch", () => {
    const model = build(english);
    assert.match(model.environment.energy.assessment ?? "", /Electricity use in the period: 100 kWh \(self-declared\)\./);
    assert.match(model.summary.executiveSummary, /The file records 4 valid items out of 4 applicable items\./);
  });

  it("listImprovementSuggestions nhận translator riêng", () => {
    const suggestions = listImprovementSuggestions(survey, answers, english);
    assert.equal(suggestions[0]?.priority, "High");
    assert.equal(listImprovementSuggestions(survey, answers)[0]?.priority, "Cao");
  });
});
