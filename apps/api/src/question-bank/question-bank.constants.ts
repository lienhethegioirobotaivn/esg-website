import type { QuestionSource, QuestionTrack } from "../database/schema/index.js";

export interface BankTab {
  readonly tabName: string;
  readonly source: QuestionSource;
  readonly track: QuestionTrack;
  readonly label: string;
  readonly groupTitle: string | null;
}

function sectorTab(
  tabName: string,
  source: QuestionSource,
  label: string,
  groupTitle = `Câu hỏi bổ sung theo ngành ${label}`,
): BankTab {
  return { tabName, source, track: "sector", label, groupTitle };
}

export const BANK_TABS: readonly BankTab[] = [
  { tabName: "01 Hồ sơ", source: "PROFILE", track: "profile", label: "", groupTitle: null },
  { tabName: "02 Chung", source: "COMMON", track: "core", label: "", groupTitle: null },
  sectorTab("03 Sản xuất", "MAN", "Sản xuất"),
  sectorTab("04 Thương mại & bán lẻ", "RET", "Thương mại & bán lẻ"),
  sectorTab("05 Dịch vụ", "SER", "Dịch vụ"),
  sectorTab("06 Công nghệ thông tin", "ICT", "Công nghệ thông tin"),
  sectorTab("07 Xây dựng & bất động sản", "CON", "Xây dựng & bất động sản"),
  sectorTab("08 Nông nghiệp & thực phẩm", "AGR", "Nông nghiệp & thực phẩm"),
  sectorTab("09 Giáo dục & đào tạo", "EDU", "Giáo dục & đào tạo"),
  sectorTab("10 Khác", "OTH", "Khác", "Câu hỏi bổ sung theo hoạt động đặc thù"),
];

export const SURVEY_TABS: readonly BankTab[] = BANK_TABS.filter((tab) => tab.track !== "profile");

export const LOGIC_TAB_NAME = "12 Logic cho Bình";
export const EVIDENCE_TAB_NAME = "18 Quy tắc minh chứng";
export const AI_CASES_TAB_NAME = "19 Ca mẫu kiểm thử AI";

export const CONTENT_FIRST_HEADER = "Mã câu";
export const LOGIC_FIRST_HEADER = "question_id";
export const AI_CASES_FIRST_HEADER = "Mã ca";

export const APPROVED_LABEL = "Đã duyệt";
export const PENDING_LABEL = "Chờ duyệt";
export const BASIC_LABEL = "Cơ bản";
export const EXTENDED_LABEL = "Mở rộng";
export const REQUIRED_LABEL = "Có";
export const OPTIONAL_LABEL = "Không";
export const ROUTE_ALL = "ALL";

export const QUESTION_CODE_PATTERN = /^(P|C|[A-Z]{3})-\d{3}$/;
export const MAX_QUESTIONS_PER_GROUP = 5;

export const PROFILE_EXTRA_INPUT_TYPES = [
  "CONSENT",
  "PERIOD",
  "SECTOR",
  "SECTORS",
  "SIZE",
  "LEVEL",
  "CAPABILITIES",
  "REVENUE",
] as const;

export const EVIDENCE_RULE_CODES = [
  "EV-PRACTICE",
  "EV-INCIDENT",
  "EV-DATA",
  "EV-OPTIONAL",
] as const;

export const SURVEY_BANK_RATE_LIMIT = { limit: 120, windowSeconds: 60 } as const;
export const SURVEY_BANK_CACHE_CONTROL = "public, max-age=60, must-revalidate";
