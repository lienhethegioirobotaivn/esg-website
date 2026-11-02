import type { PillarIcon } from "@esg/shared";
import { Landmark, Sprout, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export const PILLAR_ICON_COMPONENTS: Record<PillarIcon, LucideIcon> = {
  sprout: Sprout,
  users: Users,
  landmark: Landmark,
};
