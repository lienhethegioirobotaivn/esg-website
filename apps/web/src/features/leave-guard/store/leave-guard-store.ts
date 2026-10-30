"use client";

import { create } from "zustand";

export interface LeaveGuard {
  hasUnsavedChanges: boolean;
  hasEvidence: boolean;
  onSave: () => void;
}

interface LeaveGuardState {
  guard: LeaveGuard | null;
  pendingHref: string | null;
  setGuard: (guard: LeaveGuard | null) => void;
  requestLeave: (href: string) => void;
  cancelLeave: () => void;
}

export const useLeaveGuardStore = create<LeaveGuardState>()((set) => ({
  guard: null,
  pendingHref: null,
  setGuard: (guard) =>
    set((state) => ({
      guard,
      pendingHref: guard === null ? null : state.pendingHref,
    })),
  requestLeave: (href) => set({ pendingHref: href }),
  cancelLeave: () => set({ pendingHref: null }),
}));
