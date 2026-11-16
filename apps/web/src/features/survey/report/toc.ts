import { msg } from "@/features/locale/lib/translate";

export const TOC_KEYS = [
  "framework",
  "summary",
  "R01",
  "R02",
  "R03",
  "R04",
  "R05",
  "R06",
  "R07",
] as const;
export type TocKey = (typeof TOC_KEYS)[number];

export const TOC_ROWS: Record<TocKey, { tag: string; title: string }> = {
  framework: { tag: msg("Khung tham chiếu"), title: msg("Khung ESG và SDG") },
  summary: { tag: msg("Tổng quan"), title: msg("Tóm tắt điều hành") },
  R01: { tag: "R01", title: msg("Hồ sơ và phạm vi") },
  R02: { tag: "R02", title: msg("Môi trường") },
  R03: { tag: "R03", title: msg("Người lao động và xã hội") },
  R04: { tag: "R04", title: msg("Quản trị") },
  R05: { tag: "R05", title: msg("Nội dung theo ngành") },
  R06: { tag: "R06", title: msg("Kế hoạch cải thiện") },
  R07: { tag: "R07", title: msg("Căn cứ, giới hạn và xác nhận") },
};
