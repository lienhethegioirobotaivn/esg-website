import type { AnswerValue, PillarIcon, QuestionAspect } from "@esg/shared";
import { Landmark, Sprout, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export const ANSWER_OPTIONS = [
  { value: "implemented", label: "Đã thực hiện" },
  { value: "in_progress", label: "Đang thực hiện" },
  { value: "not_implemented", label: "Chưa thực hiện" },
] as const satisfies readonly { value: AnswerValue; label: string }[];

export const ASPECT_LABELS: Record<QuestionAspect, string> = {
  system: "Hệ thống",
  operation: "Vận hành",
  process: "Quy trình",
  environment: "Môi trường",
  customer: "Khách hàng",
  society: "Xã hội",
};

export const PILLAR_ICON_COMPONENTS: Record<PillarIcon, LucideIcon> = {
  sprout: Sprout,
  users: Users,
  landmark: Landmark,
};
