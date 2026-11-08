"use client";

import { Crop, ImagePlus, Trash2 } from "lucide-react";
import { useRef, useState } from "react";

import { Button } from "@/components/ui";

import { AdminApiError, uploadImage } from "../lib/admin-api";
import { CoverEditor } from "./cover-editor";

interface ImageFieldProps {
  value: string;
  onChange: (url: string) => void;
}

export function ImageField({ value, onChange }: ImageFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [lastFile, setLastFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm(blob: Blob) {
    try {
      onChange(await uploadImage(blob));
    } catch (caught) {
      throw new Error(
        caught instanceof AdminApiError
          ? caught.message
          : "Không tải được ảnh. Vui lòng thử lại.",
      );
    }
    setLastFile(pendingFile);
    setPendingFile(null);
  }

  function handleFile(file: File) {
    setError(null);
    setPendingFile(file);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-2">
      {value ? (
        <div
          role="img"
          aria-label="Ảnh bìa"
          style={{ backgroundImage: `url("${value}")` }}
          className="aspect-video w-full max-w-md rounded-card border border-border bg-surface-muted bg-cover bg-center"
        />
      ) : (
        <div className="flex aspect-video w-full max-w-md items-center justify-center rounded-card border border-dashed border-border-strong text-sm text-subtle">
          Chưa có ảnh bìa
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => inputRef.current?.click()}
          leadingIcon={<ImagePlus aria-hidden className="size-4" />}
        >
          {value ? "Đổi ảnh" : "Tải ảnh lên"}
        </Button>
        {value && lastFile ? (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setPendingFile(lastFile)}
            leadingIcon={<Crop aria-hidden className="size-4" />}
          >
            Chỉnh lại ảnh
          </Button>
        ) : null}
        {value ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              onChange("");
              setLastFile(null);
            }}
            leadingIcon={<Trash2 aria-hidden className="size-4" />}
          >
            Bỏ ảnh
          </Button>
        ) : null}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        tabIndex={-1}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            void handleFile(file);
          }
        }}
      />
      {error ? (
        <p role="alert" className="text-xs text-danger-600">
          {error}
        </p>
      ) : null}
      {pendingFile ? (
        <CoverEditor
          file={pendingFile}
          onCancel={() => setPendingFile(null)}
          onConfirm={handleConfirm}
        />
      ) : null}
    </div>
  );
}
