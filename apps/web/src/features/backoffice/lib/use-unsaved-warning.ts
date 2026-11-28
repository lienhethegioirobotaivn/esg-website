"use client";

import { useEffect } from "react";

export const UNSAVED_MESSAGE =
  "Bạn có thay đổi chưa lưu. Rời đi mà không lưu?";

export function useUnsavedWarning(dirty: boolean): void {
  useEffect(() => {
    if (!dirty) {
      return;
    }
    function beforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
    }
    function click(event: MouseEvent) {
      const link =
        event.target instanceof Element
          ? event.target.closest("a[href]")
          : null;
      if (
        link === null ||
        link.getAttribute("target") === "_blank" ||
        link.closest(".ProseMirror") !== null
      ) {
        return;
      }
      if (!window.confirm(UNSAVED_MESSAGE)) {
        event.preventDefault();
        event.stopPropagation();
      }
    }
    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("click", click, true);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      document.removeEventListener("click", click, true);
    };
  }, [dirty]);
}
