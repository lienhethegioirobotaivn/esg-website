import {
  HEADCOUNT_TIERS,
  INDUSTRY_SOURCES,
  selectSurvey,
  surveySchema,
  type Survey,
} from "@esg/shared/node";
import { beforeAll, describe, expect, it } from "vitest";

import { loadFixtureTables } from "./question-bank-fixture.js";
import { parseQuestionBank } from "./parse-question-bank.js";
import type { ParsedQuestion } from "./question-bank.types.js";
import { buildSurveyContent, type BankQuestionRecord } from "./survey-bank.builder.js";

let questions: ParsedQuestion[];
let records: BankQuestionRecord[];

function toRecord(question: ParsedQuestion): BankQuestionRecord {
  return {
    code: question.code,
    source: question.source,
    track: question.track,
    groupCode: question.saveGroup,
    pillar: question.pillar,
    topic: question.topic,
    inputType: question.inputType,
    unit: question.unit,
    required: question.required,
    text: question.text,
    guidance: question.guidance,
    evidenceHint: question.evidenceHint,
    improvementHint: question.improvementHint,
    declarationLevel: question.declarationLevel,
    position: question.position,
  };
}

function ids(survey: Survey): string[] {
  return survey.flatMap((pillar) => pillar.groups.flatMap((group) => group.questions.map((q) => q.id))).sort();
}

beforeAll(async () => {
  questions = [...parseQuestionBank(await loadFixtureTables()).questions];
  records = questions.filter((q) => q.reviewStatus === "approved").map(toRecord);
});

describe("dựng khảo sát từ ngân hàng câu hỏi", () => {
  it("cho cấu trúc hợp lệ với 148 câu đã duyệt của khảo sát và 25 câu hồ sơ", () => {
    const content = buildSurveyContent(records);

    expect(() => surveySchema.parse(content.survey)).not.toThrow();
    expect(ids(content.survey)).toHaveLength(148);
    expect(content.profile).toHaveLength(25);
    expect(content.survey.map((pillar) => pillar.id)).toEqual(["E", "S", "G"]);
  });

  it("không đưa câu hồ sơ hoặc câu chờ duyệt vào khảo sát", () => {
    const all = ids(buildSurveyContent(records).survey);

    expect(all.some((id) => id.startsWith("P-"))).toBe(false);
    expect(all).not.toContain("C-045");
    expect(all).not.toContain("ICT-002");
  });

  it("selectSurvey cho đúng tập câu bản demo với cả 8 ngành × 5 quy mô", () => {
    const { survey } = buildSurveyContent(records);

    for (const [industry, source] of Object.entries(INDUSTRY_SOURCES)) {
      for (const [headcount, tier] of Object.entries(HEADCOUNT_TIERS)) {
        const expected = records
          .filter((q) => q.track !== "profile")
          .filter((q) => q.source === "COMMON" || q.source === source)
          .filter((q) => q.declarationLevel === "basic" || tier === "extended")
          .map((q) => q.code)
          .sort();

        expect(ids(selectSurvey(survey, { industry, headcount }))).toEqual(expected);
      }
    }
  });

  it("ngành hoặc quy mô lạ chỉ còn câu chung mức cơ bản", () => {
    const { survey } = buildSurveyContent(records);
    const selected = selectSurvey(survey, { industry: "x", headcount: "y" });

    expect(ids(selected).every((id) => id.startsWith("C-"))).toBe(true);
    expect(selected.flatMap((p) => p.groups.flatMap((g) => g.questions)).every((q) => q.tier === "basic")).toBe(true);
  });

  it("chủ đề không có tiền tố E/S/G được xếp vào nhóm Quản trị", () => {
    const { survey } = buildSurveyContent(records);
    const governance = survey.find((pillar) => pillar.id === "G");

    expect(governance?.groups.some((group) => group.questions.some((q) => q.id === "OTH-001"))).toBe(true);
  });
});
