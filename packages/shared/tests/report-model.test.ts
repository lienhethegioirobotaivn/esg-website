import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildReportModel, listImprovementSuggestions } from "../src/report-model";
import type { ImprovementPlanInput, ReportAnswerInput } from "../src/report-types";
import type { Question, Survey } from "../src/survey";

function q(
  id: string,
  inputType: Question["inputType"],
  groupId: string,
  topic: string,
  extra: Partial<Question> = {},
): Question {
  return {
    id,
    groupId,
    order: 0,
    text: `Câu ${id}`,
    topic,
    source: id.startsWith("ICT") ? "ICT" : "COMMON",
    tier: "basic",
    inputType,
    unit: "",
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
        id: "g-e",
        pillarId: "E",
        order: 1,
        title: "Năng lượng",
        description: "",
        questions: [
          q("C-001", "PRACTICE", "g-e", "Quản lý"),
          q("C-002", "NUMBER", "g-e", "Năng lượng", { unit: "kWh" }),
          q("C-009", "NUMBER", "g-e", "Nước", { unit: "m3" }),
          q("C-004", "PRACTICE", "g-e", "Năng lượng", {
            improvementHint: "Lập kế hoạch giảm điện năng.",
          }),
          q("C-012", "NUMBER", "g-e", "Chất thải", { unit: "tấn" }),
          q("C-019", "INCIDENT", "g-e", "Sự cố"),
        ],
      },
    ],
  },
  {
    id: "S",
    name: "Xã hội",
    icon: "users",
    order: 2,
    groups: [
      {
        id: "g-s",
        pillarId: "S",
        order: 2,
        title: "Nhân sự",
        description: "",
        questions: [
          q("C-021", "INTEGER", "g-s", "Nhân sự", { unit: "người" }),
          q("C-030", "INTEGER", "g-s", "Tai nạn", { unit: "vụ" }),
          q("C-031", "INTEGER", "g-s", "Tai nạn", { unit: "người" }),
        ],
      },
    ],
  },
  {
    id: "G",
    name: "Quản trị",
    icon: "landmark",
    order: 3,
    groups: [
      {
        id: "g-g",
        pillarId: "G",
        order: 3,
        title: "Dữ liệu",
        description: "",
        questions: [
          q("C-051", "PRACTICE", "g-g", "Dữ liệu"),
          q("ICT-010", "PRACTICE", "g-g", "Sao lưu", {
            improvementHint: "Thử khôi phục sao lưu định kỳ.",
          }),
          q("C-060", "PRACTICE", "g-g", "Xác nhận"),
        ],
      },
    ],
  },
];

function a(
  value: string | null,
  number = "",
  description = "",
  files: string[] = [],
): ReportAnswerInput {
  return {
    value,
    number,
    description,
    evidence: files.map((name) => ({ name, mimeType: "image/png" })),
  };
}

const company = {
  name: "CÔNG TY CỔ PHẦN THẾ GIỚI ROBOT",
  taxCode: "0319517434",
  industry: "it",
  headcount: "10-49",
  reportPeriod: "full_year",
  reportYear: "2025",
  sites: "Văn phòng TP.HCM | Thiết kế, lập trình | Không gồm nhà máy ODM",
  secondarySectors: "education",
  capabilities: "cloud_ai,minors",
  supplierGroups: "Đối tác ODM | Nguồn gốc linh kiện | Bổ sung vào hợp đồng",
  downstreamGroups: "Trường học; nhà phân phối",
  revenueBand: "10to50",
  hasEmployees: "yes",
};

const answers: Record<string, ReportAnswerInput> = {
  "C-001": a("yes", "", "Có đầu mối", ["bang-dien.png"]),
  "C-002": a("known", "9600", "Hóa đơn điện 12 tháng", ["hd.png"]),
  "C-009": a("unknown", "", "Chưa tách đồng hồ nước"),
  "C-004": a("partial"),
  "C-012": a("known", "0", "Sổ theo dõi"),
  "C-019": a("no"),
  "C-021": a("known", "15", "Nhân sự trực tiếp"),
  "C-030": a("known", "0", ""),
  "C-031": a("unknown", "", "Chưa tổng hợp"),
  "C-051": a("no"),
  "ICT-010": a("unknown"),
  "C-060": a("yes", "", ""),
};

function build(
  overrides: Record<string, ReportAnswerInput> = {},
  plan?: ImprovementPlanInput,
) {
  return buildReportModel({
    plan,
    survey,
    company,
    answers: { ...answers, ...overrides },
    reportCode: "ESG-20261103-ABCD",
    generatedAt: "2026-11-03T02:30:00.000Z",
    contentVersion: "Bộ câu hỏi ESG v0.1",
    isDraft: false,
  });
}

describe("buildReportModel", () => {
  const model = build();

  it("điền thông tin chung đúng định dạng", () => {
    assert.equal(model.meta.period, "01/01/2025 – 31/12/2025");
    assert.equal(model.meta.issuedAt, "03/11/2026");
    assert.equal(model.meta.reportId, "ESG-20261103-ABCD");
    assert.equal(model.meta.disclosureLevel, "Cơ bản");
    assert.equal(model.meta.status, "HOÀN TẤT TỰ KHAI");
    assert.equal(model.profile.primarySector, "Công nghệ thông tin");
    assert.equal(model.profile.secondarySectors, "Giáo dục và đào tạo");
    assert.equal(model.profile.capabilities, "Cloud / AI; Làm việc với trẻ em");
    assert.equal(model.profile.revenueBand, "10 đến dưới 50 tỷ đồng");
  });

  it("giữ nguyên số liệu khai báo và gắn nguồn", () => {
    assert.equal(model.environment.electricity?.text, "9600");
    assert.equal(model.environment.electricity?.value, 9600);
    assert.equal(model.environment.electricity?.unit, "kWh");
    assert.equal(model.environment.electricity?.source, "Hóa đơn điện 12 tháng");
    assert.equal(model.social.headcount?.text, "15");
  });

  it("không biến Chưa có dữ liệu thành số 0", () => {
    assert.equal(model.environment.water?.state, "unknown");
    assert.equal(model.environment.water?.text, "Chưa có dữ liệu");
    assert.equal(model.environment.water?.value, null);
    assert.equal(model.social.fatalities?.state, "unknown");
    assert.equal(model.environment.wasteNonHazardous?.value, 0);
    assert.equal(model.social.accidents?.value, 0);
  });

  it("nêu số tử vong khi đã có dữ liệu", () => {
    const known = build({ "C-031": a("known", "0", "") });
    assert.match(
      known.social.safety.assessment ?? "",
      /0 vụ tai nạn lao động trong phạm vi báo cáo và 0 trường hợp tử vong/,
    );
  });

  it("không có câu hỏi thì khối ẩn (null)", () => {
    assert.equal(model.environment.scope1, null);
    assert.equal(model.environment.fuel, null);
    assert.equal(model.charts.ghg.length, 0);
  });

  it("tính bình quân chỉ khi có đủ số liệu", () => {
    assert.match(model.environment.energy.assessment ?? "", /Bình quân 640 kWh/);
    assert.doesNotMatch(model.environment.waterSection.assessment ?? "", /Bình quân/);
  });

  it("không suy ra không có tai nạn khi tử vong chưa có dữ liệu", () => {
    const text = model.social.safety.assessment ?? "";
    assert.match(text, /0 vụ tai nạn lao động/);
    assert.doesNotMatch(text, /tử vong/);
  });

  it("đếm trạng thái thực hành và khoảng trống", () => {
    assert.deepEqual(model.summary.practice, {
      yes: 2,
      partial: 1,
      no: 1,
      unknown: 1,
      na: 0,
      unanswered: 0,
      total: 5,
    });
    assert.equal(model.summary.evidenceCount, 2);
    assert.deepEqual(model.summary.priorities, [
      "Rà soát và bổ sung: Xử lý sự cố dữ liệu",
      "Lập kế hoạch giảm điện năng.",
      "Thử khôi phục sao lưu định kỳ.",
    ]);
    assert.equal(model.improvement.actions.length, 0);
    assert.equal(model.improvement.suggestions[0]?.id, "C-051");
    assert.equal(model.improvement.suggestions[0]?.priority, "Cao");
  });

  it("gom minh chứng theo câu hỏi kèm ghi chú chung", () => {
    const { groups } = model.evidence;
    assert.equal(groups.length, 2);
    assert.equal(groups[0]?.questionId, "C-001");
    assert.equal(groups[0]?.label, "Phân công theo dõi môi trường");
    assert.equal(groups[0]?.text, "Câu C-001");
    assert.equal(groups[0]?.note, "Có đầu mối");
    assert.deepEqual(groups[0]?.files, [{ code: "EV-001", name: "bang-dien.png" }]);
    assert.equal(groups[1]?.files[0]?.code, "EV-002");

    const many = build({
      "C-001": a("yes", "", "", ["a.png", "b.png"]),
    });
    assert.equal(many.evidence.groups[0]?.note, null);
    assert.equal(many.evidence.groups[0]?.files.length, 2);
    assert.equal(many.evidence.groups[1]?.files[0]?.code, "EV-003");
    assert.equal(many.evidence.rows.length, 3);
  });

  it("khoảng trống nêu tên nội dung và gợi ý ưu tiên theo mức", () => {
    const rows = model.improvement.gaps;
    const data = rows.find((row) => row.title === "Dữ liệu");
    assert.equal(
      data?.reason,
      "Chưa có: Xử lý sự cố dữ liệu\nChưa rõ: Sao lưu",
    );
    assert.equal(data?.priority, "Cao");
    const energy = rows.find((row) => row.title === "Năng lượng");
    assert.equal(
      energy?.reason,
      "Có một phần: Giảm tiêu thụ năng lượng\nChưa có dữ liệu: Nước",
    );
    assert.equal(energy?.priority, "Trung bình");
    const clarify = build({ "C-004": a("yes"), "C-009": a("unknown") }).improvement.gaps.find(
      (row) => row.title === "Năng lượng",
    );
    assert.equal(clarify?.priority, "Cần làm rõ trước");
  });

  it("kế hoạch do doanh nghiệp nhập thay cho đề xuất tự sinh", () => {
    const plan: ImprovementPlanInput = {
      tasks: [
        { id: "a", fromId: "", description: "Việc muộn", owner: "", due: "2026-03-31", status: "Đang thực hiện" },
        { id: "b", fromId: "C-051", description: "Sao lưu dữ liệu", owner: "Kỹ thuật", due: "2026-01-31", status: "Hoàn thành" },
        { id: "c", fromId: "", description: "Chưa hạn", owner: "Vận hành", due: "", status: "không hợp lệ" },
        { id: "d", fromId: "", description: "   ", owner: "Bỏ qua", due: "", status: "" },
      ],
      goal: "Giảm rủi ro dữ liệu",
      resources: "",
      reviewCycle: "Hằng quý",
    };
    const planned = build({}, plan).improvement;
    assert.deepEqual(
      planned.actions.map((action) => [action.description, action.owner, action.due, action.status]),
      [
        ["Sao lưu dữ liệu", "Kỹ thuật", "31/01/2026", "Hoàn thành"],
        ["Việc muộn", "Chưa cung cấp", "31/03/2026", "Đang thực hiện"],
        ["Chưa hạn", "Vận hành", "Chưa cung cấp", "Chưa bắt đầu"],
      ],
    );
    assert.equal(planned.goal, "Giảm rủi ro dữ liệu");
    assert.equal(planned.resources, null);
    assert.equal(planned.reviewCycle, "Hằng quý");
    assert.equal(planned.suggestions.some((item) => item.id === "C-051"), false);
    assert.equal(planned.suggestions.some((item) => item.id === "C-004"), true);
    assert.equal(model.improvement.goal, null);
  });

  it("liệt kê đề xuất không cần dựng cả báo cáo", () => {
    const list = listImprovementSuggestions(
      survey,
      Object.fromEntries(Object.entries(answers)),
    );
    assert.deepEqual(
      list.map((item) => item.id),
      model.improvement.suggestions.map((item) => item.id),
    );
  });

  it("phụ lục tách câu hỏi và câu trả lời", () => {
    const row = model.appendix.rows.find((entry) => entry.id === "C-002");
    assert.equal(row?.question, "Câu C-002");
    assert.equal(row?.answer, "9600 kWh (Hóa đơn điện 12 tháng)");
  });

  it("module ngành chỉ gồm câu của ngành đang chọn", () => {
    assert.equal(model.modules.length, 1);
    assert.equal(model.modules[0]?.source, "ICT");
    assert.equal(model.modules[0]?.items[0]?.id, "ICT-010");
  });

  it("trạng thái bằng chứng không bao giờ là đã xác minh", () => {
    const row = model.appendix.rows.find((entry) => entry.id === "C-002");
    assert.equal(row?.evidence, "Đã đính kèm 1 tệp; chưa xác minh");
    assert.equal(model.evidence.rows.length, 2);
    assert.doesNotMatch(JSON.stringify(model.evidence), /đã xác minh/);
  });

  it("câu chưa trả lời vào danh sách chưa khai báo", () => {
    const partial = build({ "C-051": a(null) });
    assert.match(partial.appendix.unansweredSummary ?? "", /C-051/);
    assert.equal(model.appendix.unansweredSummary, null);
  });

  it("số có dấu phân cách nghìn mơ hồ không dùng để tính", () => {
    const ambiguous = build({ "C-002": a("known", "9.600", "Hóa đơn") });
    assert.equal(ambiguous.environment.electricity?.value, null);
    assert.equal(ambiguous.environment.electricity?.text, "9.600");
    assert.doesNotMatch(ambiguous.environment.energy.assessment ?? "", /Bình quân/);
  });

  it("bản nháp mang nhãn BẢN NHÁP và mã tạm", () => {
    const draft = buildReportModel({
      survey,
      company,
      answers,
      reportCode: null,
      generatedAt: "2026-11-03T02:30:00.000Z",
      contentVersion: "Bộ câu hỏi ESG v0.1",
      isDraft: true,
    });
    assert.equal(draft.meta.status, "BẢN NHÁP");
    assert.equal(draft.meta.reportId, "Chưa lưu hồ sơ");
  });
});
