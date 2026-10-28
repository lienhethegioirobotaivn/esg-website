import type { Survey } from "@esg/shared";

import type { GroupEntry } from "../types";

export function flattenGroups(survey: Survey): GroupEntry[] {
  return survey.flatMap((pillar) =>
    pillar.groups.map((group) => ({
      pillarId: pillar.id,
      pillarName: pillar.name,
      pillarIcon: pillar.icon,
      group,
    })),
  );
}
