import { useState } from "react";

import {
  findGroupForPillar,
  resolveActiveGroup,
} from "../lib/survey-navigation";
import type { ActiveGroup } from "../lib/survey-navigation";
import type { GroupEntry } from "../types";

type RememberedGroups = Readonly<Record<string, string>>;

interface SurveyNavigation extends ActiveGroup {
  selectGroup: (groupId: string) => void;
  selectPillar: (pillarId: string) => void;
}

function rememberInitialGroup(
  entries: readonly GroupEntry[],
  groupId: string | null,
): RememberedGroups {
  const entry = entries.find((candidate) => candidate.group.id === groupId);
  return entry ? { [entry.pillarId]: entry.group.id } : {};
}

export function useSurveyNavigation(
  entries: readonly GroupEntry[],
  initialGroupId: string | null = null,
): SurveyNavigation {
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(
    initialGroupId,
  );
  const [remembered, setRemembered] = useState<RememberedGroups>(() =>
    rememberInitialGroup(entries, initialGroupId),
  );

  const active = resolveActiveGroup(entries, selectedGroupId);

  function selectGroup(groupId: string) {
    const target = entries.find((entry) => entry.group.id === groupId);
    if (!target) {
      return;
    }
    setSelectedGroupId(groupId);
    setRemembered((current) => ({ ...current, [target.pillarId]: groupId }));
  }

  function selectPillar(pillarId: string) {
    const target = findGroupForPillar(entries, pillarId, remembered[pillarId]);
    if (target) {
      selectGroup(target.group.id);
    }
  }

  return { ...active, selectGroup, selectPillar };
}
