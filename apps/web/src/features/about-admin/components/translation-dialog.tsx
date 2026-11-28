"use client";

import { useState } from "react";
import type { FormEvent } from "react";

import { Button, Field, Modal, Textarea } from "@/components/ui";
import { useNotify } from "@/features/backoffice/components/toast";
import { errorMessage, sendJson } from "@/features/backoffice/lib/api";

import type { TranslationItem, TranslationLocale } from "../lib/translations";

export function TranslationDialog({
  item,
  locale,
  localeLabel,
  onClose,
  onSaved,
}: {
  item: TranslationItem;
  locale: TranslationLocale;
  localeLabel: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const notify = useNotify();
  const current = item.manualText ?? item.glossaryText ?? item.autoText ?? "";
  const [text, setText] = useState(current);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<"save" | "clear" | null>(null);

  async function send(manualText: string | null, action: "save" | "clear") {
    setError(null);
    setSaving(action);
    try {
      await sendJson("PUT", "/admin/translations", {
        locale,
        items: [{ sourceHash: item.sourceHash, manualText }],
      });
      notify(
        manualText === null
          ? "Đã bỏ bản sửa tay."
          : "Đã lưu bản dịch sửa tay.",
      );
      onSaved();
    } catch (caught) {
      setError(errorMessage(caught, "Không lưu được bản dịch."));
      setSaving(null);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving === null && text.trim() !== "") {
      void send(text.trim(), "save");
    }
  }

  return (
    <Modal
      title={`Sửa bản dịch ${localeLabel}`}
      onClose={onClose}
      dismissible={saving === null && text === current}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1">
          <p className="text-xs font-semibold">Tiếng Việt (nguồn)</p>
          <p className="whitespace-pre-line break-words rounded-control bg-surface-muted p-3 text-sm">
            {item.sourceText}
          </p>
        </div>
        {item.manualText !== null && item.autoText ? (
          <div className="space-y-1">
            <p className="text-xs font-semibold">Bản dịch máy</p>
            <p className="whitespace-pre-line break-words text-sm text-muted">
              {item.autoText}
            </p>
          </div>
        ) : null}
        <Field
          label="Bản dịch dùng trên website"
          htmlFor="translation-text"
          hint="Bản sửa tay luôn được ưu tiên và không bị máy dịch ghi đè."
        >
          <Textarea
            id="translation-text"
            lang={locale}
            rows={6}
            maxLength={20000}
            value={text}
            onChange={(event) => setText(event.target.value)}
            autoFocus
          />
        </Field>
        {error ? (
          <p role="alert" className="text-sm text-danger-600">
            {error}
          </p>
        ) : null}
        <div className="flex flex-wrap justify-between gap-2">
          <div>
            {item.manualText !== null ? (
              <Button
                variant="ghost"
                loading={saving === "clear"}
                disabled={saving !== null}
                onClick={() => void send(null, "clear")}
              >
                Bỏ bản sửa tay
              </Button>
            ) : null}
          </div>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              disabled={saving !== null}
              onClick={onClose}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              loading={saving === "save"}
              disabled={
                saving !== null ||
                text.trim() === "" ||
                text.trim() === (item.manualText ?? current)
              }
            >
              Lưu bản sửa tay
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
