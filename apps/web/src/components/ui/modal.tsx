"use client";

import { X } from "lucide-react";
import { useEffect, useId, useRef } from "react";
import type { ReactNode } from "react";

type ModalSize = "sm" | "md" | "lg";

interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  size?: ModalSize;
  dismissible?: boolean;
}

const dialogSizeClassNames: Record<ModalSize, string> = {
  sm: "max-w-md",
  md: "max-w-2xl",
  lg: "max-w-5xl",
};

const panelSizeClassNames: Record<ModalSize, string> = {
  sm: "max-h-[85vh]",
  md: "max-h-[85vh]",
  lg: "h-[90vh]",
};

const bodySizeClassNames: Record<ModalSize, string> = {
  sm: "overflow-y-auto p-6",
  md: "overflow-y-auto p-6",
  lg: "flex min-h-0 flex-1 flex-col p-4",
};

export function Modal({
  title,
  onClose,
  children,
  size = "md",
  dismissible = true,
}: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) {
      dialog.showModal();
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onClose={onClose}
      onCancel={(event) => {
        if (!dismissible) {
          event.preventDefault();
        }
      }}
      onClick={(event) => {
        if (dismissible && event.target === event.currentTarget) {
          onClose();
        }
      }}
      className={`m-auto w-[calc(100%-2rem)] ${dialogSizeClassNames[size]} rounded-card border border-border bg-surface p-0 text-foreground shadow-xl backdrop:bg-foreground/40`}
    >
      <div className={`flex flex-col ${panelSizeClassNames[size]}`}>
        <div className="flex items-center justify-between gap-4 border-b border-border px-6 py-4">
          <h2 id={titleId} className="text-lg">
            {title}
          </h2>
          {dismissible ? (
            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng"
              className="rounded-md p-1.5 text-subtle transition-colors hover:bg-surface-muted hover:text-foreground"
            >
              <X aria-hidden className="size-5" />
            </button>
          ) : null}
        </div>
        <div className={bodySizeClassNames[size]}>{children}</div>
      </div>
    </dialog>
  );
}
