"use client";

import {
  ACCEPTED_EVIDENCE_MIME_TYPES,
  MAX_EVIDENCE_FILES,
  MAX_EVIDENCE_FILE_SIZE_BYTES,
} from "@esg/shared";
import { FileImage, FileText, Plus, Upload, X } from "lucide-react";
import { useRef, useState } from "react";
import type { ChangeEvent } from "react";

import { formatFileSize } from "@/lib/format";

import { validateEvidenceFile } from "../lib/validate-evidence-file";
import type { EvidenceItem } from "../types";

interface EvidenceUploaderProps {
  inputId: string;
  items: readonly EvidenceItem[];
  onAdd: (file: File) => void;
  onRemove: (evidenceId: string) => void;
}

const ACCEPT_ATTRIBUTE = ACCEPTED_EVIDENCE_MIME_TYPES.join(",");

export function EvidenceUploader({
  inputId,
  items,
  onAdd,
  onRemove,
}: EvidenceUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const isFull = items.length >= MAX_EVIDENCE_FILES;

  function openFilePicker() {
    inputRef.current?.click();
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }
    const message = validateEvidenceFile(file);
    if (message) {
      setError(message);
      return;
    }
    setError(null);
    onAdd(file);
  }

  return (
    <div className="space-y-2.5">
      {items.length > 0 ? (
        <ul className="space-y-2">
          {items.map((item) => {
            const Icon =
              item.file.type === "application/pdf" ? FileText : FileImage;
            return (
              <li
                key={item.id}
                className="flex items-center gap-3 rounded-control border border-border bg-surface-muted px-3 py-2"
              >
                <Icon
                  aria-hidden
                  className="size-4 shrink-0 text-primary-600"
                />
                <span
                  className="min-w-0 flex-1 truncate text-sm"
                  title={item.file.name}
                >
                  {item.file.name}
                </span>
                <span className="shrink-0 text-xs text-subtle">
                  {formatFileSize(item.file.size)}
                </span>
                <button
                  type="button"
                  onClick={() => onRemove(item.id)}
                  aria-label={`Xóa ${item.file.name}`}
                  className="rounded-md p-1 text-subtle transition-colors hover:bg-danger-50 hover:text-danger-600"
                >
                  <X aria-hidden className="size-4" />
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}

      {items.length === 0 ? (
        <button
          type="button"
          onClick={openFilePicker}
          className="flex w-full items-center justify-center gap-2 rounded-control border border-dashed border-border-strong bg-surface px-4 py-4 text-sm text-muted transition-colors hover:border-primary-400 hover:bg-primary-50 hover:text-primary-700"
        >
          <Upload aria-hidden className="size-4" />
          Tải lên bằng chứng
        </button>
      ) : null}

      {items.length > 0 && !isFull ? (
        <button
          type="button"
          onClick={openFilePicker}
          className="inline-flex items-center gap-2 rounded-control border border-dashed border-border-strong px-3 py-1.5 text-sm text-muted transition-colors hover:border-primary-400 hover:bg-primary-50 hover:text-primary-700"
        >
          <Plus aria-hidden className="size-4" />
          Thêm bằng chứng
        </button>
      ) : null}

      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={ACCEPT_ATTRIBUTE}
        onChange={handleChange}
        className="hidden"
      />

      {error ? (
        <p role="alert" className="text-xs text-danger-600">
          {error}
        </p>
      ) : null}

      <p className="text-xs text-subtle">
        PDF hoặc ảnh, mỗi tệp tối đa{" "}
        {formatFileSize(MAX_EVIDENCE_FILE_SIZE_BYTES)}. Đã tải {items.length}/
        {MAX_EVIDENCE_FILES} tệp.
      </p>
    </div>
  );
}
