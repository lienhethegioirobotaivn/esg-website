"use client";

import type { BankSummary } from "@esg/shared";
import { useState } from "react";
import type { FormEvent } from "react";

import { Button, Modal } from "@/components/ui";
import { errorMessage } from "@/features/backoffice/lib/api";

import { AreaField, TextField } from "./form-controls";

const VERSION_PATTERN = /^[0-9A-Za-z][0-9A-Za-z._-]{0,29}$/;

export function VersionDialog({
  bank,
  onClose,
  onSave,
}: {
  bank: BankSummary;
  onClose: () => void;
  onSave: (values: { version: string; note: string }) => Promise<void>;
}) {
  const [version, setVersion] = useState(bank.version);
  const [note, setNote] = useState(bank.note ?? "");
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const valid = VERSION_PATTERN.test(version.trim());

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!valid || busy) {
      return;
    }
    setBusy(true);
    setFailure(null);
    try {
      await onSave({ version: version.trim(), note: note.trim() });
    } catch (caught) {
      setFailure(errorMessage(caught, "Không lưu được."));
      setBusy(false);
    }
  }

  return (
    <Modal
      title="Số phiên bản và ghi chú"
      size="sm"
      onClose={onClose}
      dismissible={!busy}
    >
      <form onSubmit={(event) => void submit(event)} className="space-y-4">
        <TextField
          label="Số phiên bản"
          required
          maxLength={30}
          value={version}
          hint="Chữ không dấu, số, dấu chấm, gạch ngang."
          error={valid ? undefined : "Số phiên bản chưa hợp lệ."}
          onChange={setVersion}
        />
        <AreaField
          label="Ghi chú"
          maxLength={500}
          value={note}
          onChange={setNote}
        />
        {failure ? (
          <p role="alert" className="text-sm text-danger-600">
            {failure}
          </p>
        ) : null}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" disabled={busy} onClick={onClose}>
            Hủy
          </Button>
          <Button type="submit" loading={busy} disabled={!valid}>
            Lưu
          </Button>
        </div>
      </form>
    </Modal>
  );
}
