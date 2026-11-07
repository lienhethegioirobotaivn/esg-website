import type { PostSection } from "@esg/shared";

export const ABOUT_PATH = "/ve-esg-report-online";

export const SECTION_LABELS: Record<PostSection, string> = {
  "thanh-tuu": "Thành tựu",
  "tin-tuc": "Tin tức",
};

export const ACHIEVEMENT_CATEGORIES = [
  "Sự kiện",
  "Dấu mốc",
  "Giải thưởng & ghi nhận",
] as const;

export const NEWS_CATEGORIES = [
  "Kiến thức ESG",
  "Môi trường",
  "Xã hội",
  "Quản trị",
  "Thị trường & chính sách",
] as const;

export const ACHIEVEMENTS_PAGE_SIZE = 6;
export const NEWS_PAGE_SIZE = 8;

export function isPostSection(value: string): value is PostSection {
  return value === "thanh-tuu" || value === "tin-tuc";
}

export const SECTION_CATEGORIES: Record<PostSection, readonly string[]> = {
  "thanh-tuu": ACHIEVEMENT_CATEGORIES,
  "tin-tuc": NEWS_CATEGORIES,
};

export function sectionPath(section: PostSection): string {
  return section === "tin-tuc" ? `${ABOUT_PATH}/tin-tuc` : ABOUT_PATH;
}

export function postPath(section: PostSection, slug: string): string {
  return `${ABOUT_PATH}/${section}/${slug}`;
}
