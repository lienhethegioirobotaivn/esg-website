import { QUESTION_ASPECTS } from "@esg/shared";
import type { Guidance, PillarIcon } from "@esg/shared";

import { ASPECT_LABELS } from "@/features/survey";

export const PILLAR_ICON_OPTIONS = [
  { value: "sprout", label: "Cây mầm (Môi trường)" },
  { value: "users", label: "Nhóm người (Xã hội)" },
  { value: "landmark", label: "Tòa nhà (Quản trị)" },
] as const satisfies readonly { value: PillarIcon; label: string }[];

export const ASPECT_OPTIONS = QUESTION_ASPECTS.map((value) => ({
  value,
  label: ASPECT_LABELS[value],
}));

export const DEFAULT_GUIDANCE: Guidance = {
  title: "Trả lời đúng thực tế.",
  body: "Chọn mức phản ánh đúng tình hình hiện tại của doanh nghiệp. Nếu đã thực hiện, hãy mô tả ngắn gọn cách thực hiện và đính kèm bằng chứng.",
  suggestedEvidence:
    "Văn bản, quy trình, biên bản, hình ảnh hoặc báo cáo nội bộ liên quan.",
  tip: "Chưa thực hiện? Cứ ghi nhận đúng thực tế. Đây là điểm bắt đầu để cải thiện.",
};
