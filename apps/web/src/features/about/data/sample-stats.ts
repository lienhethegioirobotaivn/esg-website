import { msg } from "@/features/locale";

import type { AchievementStats } from "../types";

export const SAMPLE_STATS: AchievementStats = {
  isSample: true,
  items: [
    { id: "businesses", value: "1.000", label: msg("Doanh nghiệp sử dụng") },
    { id: "reports", value: "1.325", label: msg("Báo cáo đã tạo") },
    { id: "advisory", value: "80", label: msg("Doanh nghiệp tư vấn trực tiếp") },
    { id: "certificates", value: "25", label: msg("Chứng nhận ESG đã cấp") },
  ],
};
