import type { Guidance, PillarIcon } from "@esg/shared";

export const PILLAR_ICON_OPTIONS = [
  { value: "sprout", label: "Cây mầm (Môi trường)" },
  { value: "users", label: "Nhóm người (Xã hội)" },
  { value: "landmark", label: "Tòa nhà (Quản trị)" },
] as const satisfies readonly { value: PillarIcon; label: string }[];

export const DEFAULT_GUIDANCE: Guidance = {
  title: "Trả lời đúng thực tế.",
  body: "Chọn đáp án phản ánh đúng tình hình hiện tại của doanh nghiệp. Nếu chọn “Có”, hãy mô tả ngắn gọn cách doanh nghiệp đang thực hiện.",
  suggestedEvidence:
    "Văn bản, quy trình, biên bản, hình ảnh hoặc báo cáo nội bộ liên quan.",
  tip: "Chưa có? Cứ ghi nhận thực tế. Đây là điểm bắt đầu để cải thiện.",
};
