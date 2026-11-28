export const BANK_REVIEW_STATUSES = ["pending", "changes", "approved", "rejected"] as const;

export type BankReviewStatus = (typeof BANK_REVIEW_STATUSES)[number];

export const BANK_REVIEW_LABELS: Readonly<Record<BankReviewStatus, string>> = {
  pending: "Chờ duyệt",
  changes: "Cần sửa",
  approved: "Đã duyệt",
  rejected: "Loại bỏ",
};

export const BANK_ROLLOUT_STATUSES = ["not_started", "in_progress", "testing", "done"] as const;

export type BankRolloutStatus = (typeof BANK_ROLLOUT_STATUSES)[number];

export const BANK_ROLLOUT_LABELS: Readonly<Record<BankRolloutStatus, string>> = {
  not_started: "Chưa triển khai",
  in_progress: "Đang triển khai",
  testing: "Chờ kiểm thử",
  done: "Đã triển khai",
};

export const BANK_SOURCES = [
  "PROFILE",
  "COMMON",
  "MAN",
  "RET",
  "SER",
  "ICT",
  "CON",
  "AGR",
  "EDU",
  "OTH",
] as const;

export type BankSource = (typeof BANK_SOURCES)[number];

export const BANK_SOURCE_LABELS: Readonly<Record<BankSource, string>> = {
  PROFILE: "Hồ sơ",
  COMMON: "Chung",
  MAN: "Sản xuất",
  RET: "Thương mại & bán lẻ",
  SER: "Dịch vụ",
  ICT: "Công nghệ thông tin",
  CON: "Xây dựng & bất động sản",
  AGR: "Nông nghiệp & thực phẩm",
  EDU: "Giáo dục & đào tạo",
  OTH: "Khác",
};

export const BANK_PROFILE_INPUT_TYPES = [
  "CONSENT",
  "PERIOD",
  "SECTOR",
  "SECTORS",
  "SIZE",
  "LEVEL",
  "CAPABILITIES",
  "REVENUE",
] as const;

export const BANK_INPUT_TYPE_LABELS: Readonly<Record<string, string>> = {
  PRACTICE: "Thực hành (Có / Một phần / Chưa có)",
  NUMBER: "Số liệu",
  INTEGER: "Số nguyên",
  TEXT: "Văn bản",
  INCIDENT: "Sự cố (Có / Không, phải mô tả)",
  PRESENCE: "Có phát sinh (Có / Không / Chưa rõ)",
  FUEL_TABLE: "Bảng nhiên liệu",
  WORKFORCE_TABLE: "Bảng lao động",
  CONSENT: "Đồng ý tự nguyện",
  PERIOD: "Kỳ báo cáo",
  SECTOR: "Ngành chính",
  SECTORS: "Ngành bổ sung",
  SIZE: "Quy mô nhân sự",
  LEVEL: "Mức khai báo",
  CAPABILITIES: "Hoạt động đặc thù",
  REVENUE: "Doanh thu",
};

export const BANK_EVIDENCE_CODES = ["EV-PRACTICE", "EV-INCIDENT", "EV-DATA", "EV-OPTIONAL"] as const;

export type BankEvidenceCode = (typeof BANK_EVIDENCE_CODES)[number];

export const BANK_EVIDENCE_CODE_LABELS: Readonly<Record<BankEvidenceCode, string>> = {
  "EV-PRACTICE": "Thực hành",
  "EV-INCIDENT": "Sự cố",
  "EV-DATA": "Số liệu",
  "EV-OPTIONAL": "Tự nguyện",
};

export const BANK_EVIDENCE_APPLY_OPTIONS = [
  "Không gọi AI",
  "Tệp hồ sơ tự nguyện",
  "Số liệu tự nguyện",
  "Thực hành tự nguyện",
  "Sự cố · phần được phép",
] as const;

export const BANK_AI_EXPECTED_OPTIONS = [
  "Phù hợp sơ bộ",
  "Cần bổ sung",
  "Không liên quan",
  "Không đọc được",
  "Không gọi AI",
  "Chưa xử lý",
] as const;

export const BANK_AI_TEST_STATUS_OPTIONS = ["Chưa chạy", "Đạt", "Lỗi", "Cần làm rõ"] as const;

export const BANK_EVIDENCE_TEXT_FIELDS = [
  ["accepted", "Minh chứng chấp nhận"],
  ["minimum", "Điều kiện tối thiểu"],
  ["scope", "Phạm vi & thời gian"],
  ["supplementWhen", "Cần bổ sung khi"],
  ["limits", "Giới hạn kết luận"],
  ["aiHandoff", "AI & chuyển người duyệt"],
] as const;

export const BANK_EVIDENCE_FIELDS = [
  ...BANK_EVIDENCE_TEXT_FIELDS,
  ["apply", "Cách áp dụng"],
  ["ruleVersion", "Phiên bản quy tắc"],
  ["approval", "Duyệt quy tắc"],
  ["reviewNote", "Nhân · góp ý"],
  ["reviewedBy", "Người duyệt"],
  ["reviewedOn", "Ngày duyệt"],
] as const;

export type BankEvidenceFieldKey = (typeof BANK_EVIDENCE_FIELDS)[number][0];

export const BANK_AI_CASE_FIELDS = [
  ["id", "Mã ca"],
  ["scenario", "Tình huống"],
  ["input", "Đầu vào giả lập"],
  ["expected", "Đầu ra mong đợi"],
  ["needsReview", "Cần người duyệt?"],
  ["basis", "Căn cứ / việc cần làm"],
  ["forbidden", "Không được suy diễn"],
  ["result", "Kết quả AI thực tế"],
  ["testStatus", "Kiểm thử"],
  ["model", "API / model & phiên bản"],
  ["durationMs", "Thời gian (ms)"],
  ["costUsd", "Chi phí (USD)"],
  ["approval", "Duyệt ca mẫu"],
  ["note", "Nhân / Bình · góp ý"],
  ["runDate", "Ngày chạy"],
  ["fileStatus", "Tình trạng tệp mẫu"],
  ["ruleVersion", "Phiên bản quy tắc"],
] as const;

export type BankAiCaseFieldKey = (typeof BANK_AI_CASE_FIELDS)[number][0];

export type BankAiCase = Partial<Record<BankAiCaseFieldKey, string>>;

export type BankEvidenceRule = Partial<Record<BankEvidenceFieldKey, string>> & {
  code: string;
  testCases?: BankAiCase[];
};

export const BANK_REPORT_SECTIONS = ["R01", "R02", "R03", "R04", "R05", "R06", "INTERNAL"] as const;

export const BANK_MAX_QUESTIONS_PER_GROUP = 5;

export type BankStatus = "draft" | "published" | "archived";

export const BANK_STATUS_LABELS: Readonly<Record<BankStatus, string>> = {
  draft: "Bản nháp",
  published: "Đang xuất bản",
  archived: "Đã lưu trữ",
};

export interface BankSummary {
  id: string;
  version: string;
  status: BankStatus;
  note: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  counts: Record<BankReviewStatus, number> & { total: number };
  reports: number;
}

export interface BankGroupView {
  code: string;
  title: string;
  position: number;
}

export interface BankQuestionView {
  id: string;
  code: string;
  source: BankSource;
  groupCode: string;
  position: number;
  pillar: "E" | "S" | "G" | null;
  topic: string;
  text: string;
  guidance: string;
  evidenceHint: string;
  improvementHint: string;
  inputType: string;
  unit: string;
  required: boolean;
  declarationLevel: "basic" | "extended";
  capabilities: string[];
  reportSection: string;
  sourceRef: string;
  reviewStatus: BankReviewStatus;
  reviewNote: string;
  reviewedBy: string;
  reviewedOn: string;
  rolloutStatus: BankRolloutStatus;
  evidenceRule: BankEvidenceRule | null;
  isNew: boolean;
  usedByReport: boolean;
}

export interface BankDetail {
  bank: BankSummary;
  groups: BankGroupView[];
  questions: BankQuestionView[];
  nextCodes: Record<BankSource, string>;
}

export interface BankIssue {
  severity: "error" | "warning";
  tab: string;
  row: number | null;
  code: string | null;
  message: string;
}

export interface BankChanges {
  comparedTo: string | null;
  added: string[];
  removed: string[];
  changed: string[];
}

export interface BankCheckResult {
  ok: boolean;
  issues: BankIssue[];
  changes: BankChanges;
}

export interface BankImportResult {
  ok: boolean;
  imported: boolean;
  issues: BankIssue[];
  version: string | null;
  questions: number;
  groups: number;
  replacesDraft: boolean;
  bankId: string | null;
}
