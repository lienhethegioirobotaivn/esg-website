"use client";

import { Loader2 } from "lucide-react";
import { useState } from "react";
import type { ReactNode } from "react";

import { Button, Modal } from "@/components/ui";

interface ConfirmDialogProps {
  title: string;
  confirmLabel: string;
  busyLabel: string;
  children: ReactNode;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}

export function ConfirmDialog({
  title,
  confirmLabel,
  busyLabel,
  children,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    if (isBusy) {
      return;
    }
    setError(null);
    setIsBusy(true);
    try {
      await onConfirm();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Thao tác không thành công.",
      );
      setIsBusy(false);
    }
  }

  return (
    <Modal title={title} size="sm" onClose={onCancel} dismissible={!isBusy}>
      <div aria-busy={isBusy} className="space-y-4">
        <div className="text-sm text-muted">{children}</div>
        {error ? (
          <p role="alert" className="text-sm text-danger-600">
            {error}
          </p>
        ) : null}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" disabled={isBusy} onClick={onCancel}>
            Hủy
          </Button>
          <Button
            variant="danger"
            disabled={isBusy}
            onClick={() => void handleConfirm()}
            leadingIcon={
              isBusy ? (
                <Loader2 aria-hidden className="size-4 animate-spin" />
              ) : undefined
            }
          >
            {isBusy ? busyLabel : confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
