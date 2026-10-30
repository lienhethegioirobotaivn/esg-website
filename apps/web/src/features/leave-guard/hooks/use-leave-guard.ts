"use client";

import { useEffect } from "react";

import { useLeaveGuardStore } from "../store/leave-guard-store";

interface UseLeaveGuardInput {
  hasUnsavedChanges: boolean;
  hasEvidence: boolean;
  onSave: () => void;
}

export function useLeaveGuard({
  hasUnsavedChanges,
  hasEvidence,
  onSave,
}: UseLeaveGuardInput): void {
  const setGuard = useLeaveGuardStore((state) => state.setGuard);
  const isActive = hasUnsavedChanges || hasEvidence;

  useEffect(() => {
    if (!isActive) {
      setGuard(null);
      return;
    }
    setGuard({ hasUnsavedChanges, hasEvidence, onSave });
    return () => setGuard(null);
  }, [isActive, hasUnsavedChanges, hasEvidence, onSave, setGuard]);

  useEffect(() => {
    if (!isActive) {
      return;
    }
    function handleBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isActive]);
}
