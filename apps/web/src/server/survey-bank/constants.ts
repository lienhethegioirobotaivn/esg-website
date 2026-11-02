import { COMMON_SOURCE } from "@esg/shared";
import type { QuestionSource } from "@esg/shared";

export interface QuestionTab {
  readonly tabName: string;
  readonly source: QuestionSource;
  readonly label: string;
  readonly groupTitle: string | null;
}

function sectorTab(
  tabName: string,
  source: QuestionSource,
  label: string,
  groupTitle = `Câu hỏi bổ sung theo ngành ${label}`,
): QuestionTab {
  return { tabName, source, label, groupTitle };
}

export const QUESTION_TABS: readonly QuestionTab[] = [
  { tabName: "02 Chung", source: COMMON_SOURCE, label: "", groupTitle: null },
  sectorTab("03 Sản xuất", "MAN", "Sản xuất"),
  sectorTab("04 Thương mại & bán lẻ", "RET", "Thương mại & bán lẻ"),
  sectorTab("05 Dịch vụ", "SER", "Dịch vụ"),
  sectorTab("06 Công nghệ thông tin", "ICT", "Công nghệ thông tin"),
  sectorTab("07 Xây dựng & bất động sản", "CON", "Xây dựng & bất động sản"),
  sectorTab("08 Nông nghiệp & thực phẩm", "AGR", "Nông nghiệp & thực phẩm"),
  sectorTab("09 Giáo dục & đào tạo", "EDU", "Giáo dục & đào tạo"),
  sectorTab("10 Khác", "OTH", "Khác", "Câu hỏi bổ sung theo hoạt động đặc thù"),
];

export const LOGIC_TAB_NAME = "12 Logic cho Bình";

export const CONTENT_FIRST_HEADER = "Mã câu";
export const LOGIC_FIRST_HEADER = "question_id";

export const APPROVED_STATUS = "Đã duyệt";
export const EXTENDED_LABEL = "Mở rộng";
