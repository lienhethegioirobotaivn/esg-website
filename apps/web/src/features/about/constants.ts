import type { PostSection } from "@esg/shared";

import { msg } from "@/features/locale";

export const ABOUT_PATH = "/ve-esg-report-online";

export const SECTION_LABELS: Record<PostSection, string> = {
  "thanh-tuu": msg("Thành tựu"),
  "tin-tuc": msg("Tin tức"),
};

export const ACHIEVEMENT_CATEGORIES = [
  msg("Sự kiện"),
  msg("Dấu mốc"),
  msg("Giải thưởng & ghi nhận"),
] as const;

export const NEWS_CATEGORIES = [
  msg("Kiến thức ESG"),
  msg("Môi trường"),
  msg("Xã hội"),
  msg("Quản trị"),
  msg("Thị trường & chính sách"),
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
