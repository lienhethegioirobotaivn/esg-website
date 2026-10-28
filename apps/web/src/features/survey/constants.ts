import type { AnswerValue, PillarIcon } from "@esg/shared";
import { Landmark, Sprout, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export const ANSWER_OPTIONS = [
  { value: "yes", label: "Có" },
  { value: "no", label: "Chưa có" },
  { value: "not_applicable", label: "Không áp dụng" },
] as const satisfies readonly { value: AnswerValue; label: string }[];

export const PILLAR_ICON_COMPONENTS: Record<PillarIcon, LucideIcon> = {
  sprout: Sprout,
  users: Users,
  landmark: Landmark,
};
