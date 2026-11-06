import {
  CAPABILITY_OPTIONS,
  LEGAL_FORMS,
  REPORT_PERIODS,
  REVENUE_BANDS,
  getAnswerChoices,
} from "@esg/shared";
import type { Question, Survey } from "@esg/shared";

const INPUT_TYPE_HINTS: Readonly<Record<string, string>> = {
  PRACTICE: "chính sách / thực hành",
  INCIDENT: "sự cố",
  PRESENCE: "có / không",
  NUMBER: "số liệu (số thập phân)",
  INTEGER: "số liệu (số nguyên)",
  TEXT: "văn bản",
  FUEL_TABLE: "bảng nhiên liệu (viết nhiều dòng trong note)",
  WORKFORCE_TABLE: "bảng lao động (viết nhiều dòng trong note)",
};

const COMMON_RULES = [
  "Chỉ dùng thông tin có thật trong tài liệu được cung cấp hoặc trang web công khai của doanh nghiệp. Không suy đoán, không dùng số của doanh nghiệp khác.",
  "Câu hoặc trường nào không tìm thấy thông tin thì bỏ qua, không đưa vào kết quả. Không điền \"unknown\" để lấp chỗ.",
  "Mỗi mục có \"quote\": trích nguyên văn đoạn có thông tin, sao chép chính xác từng ký tự từ tài liệu, không sửa số, không tóm tắt (tối đa 300 ký tự). \"url\": đường dẫn tới trang hoặc tệp gốc của chính doanh nghiệp (ưu tiên hơn bản sao của bên thứ ba). \"page\": số trang nếu biết, nếu không biết thì để chuỗi rỗng.",
  "Chỉ trả về một khối JSON duy nhất, không thêm chữ nào khác.",
];

const ANSWER_RULES = [
  "\"value\" phải là một trong các giá trị liệt kê cạnh câu hỏi đó.",
  "Với câu số liệu (NUMBER, INTEGER) khi value là \"known\": \"number\" chỉ gồm chữ số và dấu chấm hoặc phẩy thập phân, không có dấu phân cách hàng nghìn, không kèm đơn vị. Nếu tài liệu dùng đơn vị khác, đổi sang đúng đơn vị của câu hỏi, và \"quote\" vẫn là câu gốc trong tài liệu.",
  "\"note\": một đến hai câu mô tả bằng tiếng Việt. Bắt buộc có khi value là \"na\", hoặc câu loại sự cố / văn bản / bảng khi có nội dung. Với bảng, mỗi dòng viết một hạng mục.",
  "Chỉ chọn \"yes\" cho câu chính sách khi tài liệu nói rõ doanh nghiệp đã có. Nếu chỉ có một phần thì \"partial\". Mọi câu trả lời \"yes\", \"partial\", \"known\", \"provided\" đều phải có \"quote\".",
];

export interface PromptHeader {
  readonly name: string;
  readonly year: string;
  readonly source: string;
}

export interface QuestionGroupView {
  readonly group: string;
  readonly items: readonly Question[];
}

function questionLine(question: Question): string {
  const choices = getAnswerChoices(question.inputType)
    .map((choice) => choice.value)
    .join(" | ");
  const unit = question.unit === "" ? "" : `; đơn vị: ${question.unit}`;
  const hint = INPUT_TYPE_HINTS[question.inputType] ?? question.inputType;
  return `- [${question.id}] ${question.text} (loại: ${hint}; value: ${choices}${unit})`;
}

function numbered(rules: readonly string[], offset: number): string[] {
  return rules.map((rule, index) => `${index + 1 + offset}. ${rule}`);
}

function headerLines(header: PromptHeader, role: string): string[] {
  return [
    role,
    `Doanh nghiệp: ${header.name}`,
    `Năm báo cáo cần lấy: ${header.year}`,
    `Nguồn: ${header.source}`,
  ];
}

function companyFieldLines(): string[] {
  const periods = REPORT_PERIODS.join(" | ");
  const legalForms = LEGAL_FORMS.join(" | ");
  const revenue = REVENUE_BANDS.map((band) => band.value).join(" | ");
  const capabilities = CAPABILITY_OPTIONS.map((option) => option.value).join(" | ");
  return [
    "- name: tên pháp lý đầy đủ",
    "- taxCode: mã số thuế",
    "- address: địa chỉ trụ sở",
    `- reportPeriod: ${periods}`,
    "- reportYear: năm báo cáo, chỉ gồm 4 chữ số",
    "- reportScope: phạm vi lập báo cáo (một hai câu)",
    "- tradingName: tên giao dịch hoặc tên thương hiệu",
    `- legalForm: ${legalForms}`,
    "- countries: quốc gia, vùng hoạt động",
    "- activities: sản phẩm, dịch vụ chính",
    "- markets: thị trường và nhóm khách hàng",
    `- revenueBand: ${revenue} (chỉ khi tài liệu nêu doanh thu)`,
    "- hasEmployees, hasContractors: yes | no | unknown",
    `- capabilities: danh sách mã cách nhau bằng dấu phẩy, từ: ${capabilities}`,
    "- Không cần điền ngành và quy mô lao động.",
  ];
}

function questionBlock(groups: readonly QuestionGroupView[]): string[] {
  return groups.flatMap((group) => [
    "",
    `Nhóm: ${group.group}`,
    ...group.items.map(questionLine),
  ]);
}

export function companyPrompt(header: PromptHeader): string {
  return [
    ...headerLines(
      header,
      "Bạn là trợ lý thu thập thông tin hồ sơ doanh nghiệp để chuẩn bị dữ liệu kiểm thử cho một công cụ báo cáo ESG.",
    ),
    "",
    "Quy tắc:",
    ...numbered(COMMON_RULES, 0),
    "",
    "Điền các trường trong \"company\" (chỉ trường tìm thấy). Giá trị theo từng trường:",
    ...companyFieldLines(),
    "",
    "Định dạng đầu ra:",
    "```json",
    '{ "company": { "name": "", "taxCode": "" }, "evidence": { "name": { "quote": "", "url": "", "page": "" } } }',
    "```",
    "Trong \"evidence\", mỗi khóa là tên trường của company đã điền.",
  ].join("\n");
}

export function pillarPrompt(
  header: PromptHeader,
  pillarName: string,
  groups: readonly QuestionGroupView[],
): string {
  return [
    ...headerLines(
      header,
      "Bạn là trợ lý thu thập dữ liệu ESG để chuẩn bị dữ liệu kiểm thử cho một công cụ báo cáo ESG.",
    ),
    `Phần: ${pillarName}`,
    "",
    "Quy tắc:",
    ...numbered(COMMON_RULES, 0),
    ...numbered(ANSWER_RULES, COMMON_RULES.length),
    "",
    "Định dạng đầu ra:",
    "```json",
    '{ "answers": [ { "id": "", "value": "", "number": "", "note": "", "quote": "", "url": "", "page": "" } ] }',
    "```",
    "",
    "Danh sách câu hỏi:",
    ...questionBlock(groups),
  ].join("\n");
}

export function fullPrompt(
  header: PromptHeader,
  survey: Survey,
): string {
  const groups = survey.flatMap((pillar) =>
    pillar.groups.map((group) => ({
      group: `${pillar.name} · ${group.title}`,
      items: group.questions,
    })),
  );
  return [
    ...headerLines(
      header,
      "Bạn là trợ lý thu thập dữ liệu ESG để chuẩn bị dữ liệu kiểm thử cho một công cụ báo cáo ESG.",
    ),
    "",
    "Quy tắc:",
    ...numbered(COMMON_RULES, 0),
    ...numbered(ANSWER_RULES, COMMON_RULES.length),
    "",
    "Phần 1. Điền các trường trong \"company\" (chỉ trường tìm thấy). Giá trị theo từng trường:",
    ...companyFieldLines(),
    "",
    "Phần 2. Trả lời các câu hỏi bên dưới trong \"answers\".",
    "",
    "Định dạng đầu ra:",
    "```json",
    '{ "company": { "name": "" }, "evidence": { "name": { "quote": "", "url": "", "page": "" } }, "answers": [ { "id": "", "value": "", "number": "", "note": "", "quote": "", "url": "", "page": "" } ] }',
    "```",
    "Trong \"evidence\", mỗi khóa là tên trường của company đã điền.",
    "",
    "Danh sách câu hỏi:",
    ...questionBlock(groups),
  ].join("\n");
}

export function groupQuestions(survey: Survey, pillarId: string): QuestionGroupView[] {
  const pillar = survey.find((entry) => entry.id === pillarId);
  return (pillar?.groups ?? []).map((group) => ({
    group: group.title,
    items: group.questions,
  }));
}
