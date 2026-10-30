import type { GroupEntry } from "../types";

export interface ActiveGroup {
  readonly index: number;
  readonly entry: GroupEntry | null;
  readonly previous: GroupEntry | null;
  readonly next: GroupEntry | null;
}

export function resolveActiveGroup(
  entries: readonly GroupEntry[],
  selectedGroupId: string | null,
): ActiveGroup {
  const foundIndex = entries.findIndex(
    (entry) => entry.group.id === selectedGroupId,
  );
  const index = foundIndex >= 0 ? foundIndex : 0;
  return {
    index,
    entry: entries[index] ?? null,
    previous: entries[index - 1] ?? null,
    next: entries[index + 1] ?? null,
  };
}

export function findGroupForPillar(
  entries: readonly GroupEntry[],
  pillarId: string,
  rememberedGroupId: string | undefined,
): GroupEntry | null {
  const inPillar = entries.filter((entry) => entry.pillarId === pillarId);
  return (
    inPillar.find((entry) => entry.group.id === rememberedGroupId) ??
    inPillar[0] ??
    null
  );
}
