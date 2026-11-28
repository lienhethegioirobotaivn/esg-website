import { BANK_TABS, MAX_QUESTIONS_PER_GROUP } from "./question-bank.constants.js";
import type { QuestionSource, QuestionTrack } from "../database/schema/index.js";

export interface LayoutItem {
  readonly key: string;
  readonly source: QuestionSource;
  readonly groupCode: string | null;
  readonly topic: string;
}

export interface LayoutPlacement {
  readonly groupCode: string;
  readonly position: number;
}

export interface LayoutGroup {
  readonly code: string;
  readonly title: string;
  readonly track: QuestionTrack;
  readonly position: number;
}

export interface BankLayout {
  readonly placements: ReadonlyMap<string, LayoutPlacement>;
  readonly groups: readonly LayoutGroup[];
}

export function codePrefix(source: QuestionSource): string {
  if (source === "PROFILE") {
    return "P";
  }
  return source === "COMMON" ? "C" : source;
}

function groupNumber(code: string, prefix: string): number {
  const match = new RegExp(`^${prefix}-G(\\d+)$`).exec(code);
  return match === null ? 0 : Number(match[1]);
}

function planSource(
  items: readonly LayoutItem[],
  prefix: string,
  taken: Set<string>,
): string[] {
  const originalSizes = new Map<string, number>();
  for (const item of items) {
    if (item.groupCode !== null) {
      originalSizes.set(item.groupCode, (originalSizes.get(item.groupCode) ?? 0) + 1);
    }
  }

  const sizes = new Map<string, number>();
  const assigned: string[] = [];
  let current: string | null = null;
  const room = (code: string): boolean => (sizes.get(code) ?? 0) < MAX_QUESTIONS_PER_GROUP;
  const newCode = (): string => {
    let number = Math.max(0, ...[...taken].map((code) => groupNumber(code, prefix))) + 1;
    let code = `${prefix}-G${String(number).padStart(2, "0")}`;
    while (taken.has(code)) {
      number += 1;
      code = `${prefix}-G${String(number).padStart(2, "0")}`;
    }
    taken.add(code);
    return code;
  };

  items.forEach((item, index) => {
    const wanted = item.groupCode;
    if (wanted !== null && !sizes.has(wanted)) {
      current = wanted;
    } else if (wanted !== null && wanted === current && room(current)) {
      current = wanted;
    } else if (current === null || !room(current)) {
      const next = items[index + 1]?.groupCode ?? null;
      const joinNext =
        wanted === null &&
        next !== null &&
        !sizes.has(next) &&
        (originalSizes.get(next) ?? 0) < MAX_QUESTIONS_PER_GROUP;
      current = joinNext ? next : newCode();
    }
    sizes.set(current, (sizes.get(current) ?? 0) + 1);
    assigned.push(current);
  });
  return assigned;
}

export function planLayout(
  items: readonly LayoutItem[],
  existingCodes: readonly string[] = [],
): BankLayout {
  const taken = new Set<string>(existingCodes);
  for (const item of items) {
    if (item.groupCode !== null) {
      taken.add(item.groupCode);
    }
  }

  const placements = new Map<string, LayoutPlacement>();
  const topics = new Map<string, string[]>();
  const tracks = new Map<string, QuestionTrack>();
  for (const tab of BANK_TABS) {
    const own = items.filter((item) => item.source === tab.source);
    const codes = planSource(own, codePrefix(tab.source), taken);
    own.forEach((item, index) => {
      const groupCode = codes[index] as string;
      placements.set(item.key, { groupCode, position: index + 1 });
      tracks.set(groupCode, tab.track);
      const list = topics.get(groupCode) ?? [];
      if (item.topic !== "" && !list.includes(item.topic)) {
        list.push(item.topic);
      }
      topics.set(groupCode, list);
    });
  }

  const groups = [...topics.entries()].map(([code, list], index) => ({
    code,
    title: list.length > 0 ? list.join(", ") : code,
    track: tracks.get(code) as QuestionTrack,
    position: index + 1,
  }));
  return { placements, groups };
}
