"use client";

import type {
  Pillar,
  PillarInput,
  Question,
  QuestionGroup,
  QuestionGroupInput,
  QuestionInput,
} from "@esg/shared";
import { create } from "zustand";

import {
  pillars as initialPillars,
  questionGroups as initialGroups,
  questions as initialQuestions,
} from "@/data";
import { createId } from "@/lib/id";

export type MoveDirection = -1 | 1;

interface SurveyContentActions {
  addPillar: (input: PillarInput) => void;
  updatePillar: (id: string, input: PillarInput) => void;
  removePillar: (id: string) => void;
  addGroup: (input: QuestionGroupInput) => string;
  updateGroup: (id: string, input: QuestionGroupInput) => void;
  removeGroup: (id: string) => void;
  moveGroup: (id: string, direction: MoveDirection) => void;
  addQuestion: (input: QuestionInput) => void;
  updateQuestion: (id: string, input: QuestionInput) => void;
  removeQuestion: (id: string) => void;
  moveQuestion: (id: string, direction: MoveDirection) => void;
}

interface SurveyContentState {
  pillars: Pillar[];
  groups: QuestionGroup[];
  questions: Question[];
  actions: SurveyContentActions;
}

function nextOrder(items: readonly { order: number }[]): number {
  return items.reduce((max, item) => Math.max(max, item.order), 0) + 1;
}

function reorder<T extends { id: string; order: number }>(
  items: readonly T[],
  isSibling: (item: T) => boolean,
  id: string,
  direction: MoveDirection,
): T[] {
  const siblings = items.filter(isSibling).sort((a, b) => a.order - b.order);
  const index = siblings.findIndex((item) => item.id === id);
  const current = siblings[index];
  const target = siblings[index + direction];
  if (!current || !target) {
    return [...items];
  }
  return items.map((item) => {
    if (item.id === current.id) {
      return { ...item, order: target.order };
    }
    if (item.id === target.id) {
      return { ...item, order: current.order };
    }
    return item;
  });
}

export const useSurveyContentStore = create<SurveyContentState>()((set) => ({
  pillars: initialPillars,
  groups: initialGroups,
  questions: initialQuestions,
  actions: {
    addPillar: (input) =>
      set((state) => ({
        pillars: [
          ...state.pillars,
          { ...input, id: createId(), order: nextOrder(state.pillars) },
        ],
      })),

    updatePillar: (id, input) =>
      set((state) => ({
        pillars: state.pillars.map((pillar) =>
          pillar.id === id ? { ...pillar, ...input } : pillar,
        ),
      })),

    removePillar: (id) =>
      set((state) => {
        const groupIds = new Set(
          state.groups
            .filter((group) => group.pillarId === id)
            .map((group) => group.id),
        );
        return {
          pillars: state.pillars.filter((pillar) => pillar.id !== id),
          groups: state.groups.filter((group) => group.pillarId !== id),
          questions: state.questions.filter(
            (question) => !groupIds.has(question.groupId),
          ),
        };
      }),

    addGroup: (input) => {
      const id = createId();
      set((state) => ({
        groups: [
          ...state.groups,
          { ...input, id, order: nextOrder(state.groups) },
        ],
      }));
      return id;
    },

    updateGroup: (id, input) =>
      set((state) => ({
        groups: state.groups.map((group) =>
          group.id === id ? { ...group, ...input } : group,
        ),
      })),

    removeGroup: (id) =>
      set((state) => ({
        groups: state.groups.filter((group) => group.id !== id),
        questions: state.questions.filter(
          (question) => question.groupId !== id,
        ),
      })),

    moveGroup: (id, direction) =>
      set((state) => {
        const group = state.groups.find((item) => item.id === id);
        if (!group) {
          return {};
        }
        return {
          groups: reorder(
            state.groups,
            (item) => item.pillarId === group.pillarId,
            id,
            direction,
          ),
        };
      }),

    addQuestion: (input) =>
      set((state) => {
        const siblings = state.questions.filter(
          (question) => question.groupId === input.groupId,
        );
        return {
          questions: [
            ...state.questions,
            { ...input, id: createId(), order: nextOrder(siblings) },
          ],
        };
      }),

    updateQuestion: (id, input) =>
      set((state) => ({
        questions: state.questions.map((question) =>
          question.id === id ? { ...question, ...input } : question,
        ),
      })),

    removeQuestion: (id) =>
      set((state) => ({
        questions: state.questions.filter((question) => question.id !== id),
      })),

    moveQuestion: (id, direction) =>
      set((state) => {
        const question = state.questions.find((item) => item.id === id);
        if (!question) {
          return {};
        }
        return {
          questions: reorder(
            state.questions,
            (item) => item.groupId === question.groupId,
            id,
            direction,
          ),
        };
      }),
  },
}));

export function useSurveyContentActions(): SurveyContentActions {
  return useSurveyContentStore((state) => state.actions);
}
