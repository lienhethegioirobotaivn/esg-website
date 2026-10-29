import type { Pillar } from "@esg/shared";

import { PILLAR_IDS } from "./ids";

export const pillars: Pillar[] = [
  { id: PILLAR_IDS.environment, name: "Môi trường", icon: "sprout", order: 1 },
  { id: PILLAR_IDS.social, name: "Xã hội", icon: "users", order: 2 },
  { id: PILLAR_IDS.governance, name: "Quản trị", icon: "landmark", order: 3 },
];
