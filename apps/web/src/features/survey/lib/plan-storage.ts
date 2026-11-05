import { EMPTY_PLAN } from "@esg/shared";
import type { ImprovementPlanInput, PlanTaskInput } from "@esg/shared";

const STORAGE_KEY = "esg-improvement-plan-v1";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function readTask(value: unknown): PlanTaskInput | null {
  if (!isRecord(value)) {
    return null;
  }
  const id = text(value["id"]);
  if (id === "") {
    return null;
  }
  return {
    id,
    fromId: text(value["fromId"]),
    description: text(value["description"]),
    owner: text(value["owner"]),
    due: text(value["due"]),
    status: text(value["status"]),
  };
}

export function loadPlan(): ImprovementPlanInput {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === null) {
      return EMPTY_PLAN;
    }
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) {
      return EMPTY_PLAN;
    }
    const tasks = Array.isArray(parsed["tasks"])
      ? parsed["tasks"]
          .map(readTask)
          .filter((task): task is PlanTaskInput => task !== null)
      : [];
    return {
      tasks,
      goal: text(parsed["goal"]),
      resources: text(parsed["resources"]),
      reviewCycle: text(parsed["reviewCycle"]),
    };
  } catch {
    return EMPTY_PLAN;
  }
}

export function savePlan(plan: ImprovementPlanInput): boolean {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(plan));
    return true;
  } catch {
    return false;
  }
}

export function clearPlan(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    return;
  }
}
