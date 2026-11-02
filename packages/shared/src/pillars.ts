import type { PillarCode, PillarIcon } from "./constants";

export interface PillarDefinition {
  readonly id: PillarCode;
  readonly name: string;
  readonly icon: PillarIcon;
  readonly order: number;
}

export const ESG_PILLARS: readonly PillarDefinition[] = [
  { id: "E", name: "Môi trường", icon: "sprout", order: 1 },
  { id: "S", name: "Xã hội", icon: "users", order: 2 },
  { id: "G", name: "Quản trị", icon: "landmark", order: 3 },
];
