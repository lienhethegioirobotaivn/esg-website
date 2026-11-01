"use client";

import { ImagePlus, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";

import { Button } from "@/components/ui";
import { formatFileSize } from "@/lib/format";

import { LOGO_ACCEPTED_TYPES, validateLogoFile } from "../lib/validate-logo";

const INPUT_ID = "company-logo";

interface LogoUploaderProps {
  file: File | null;
  onChange: (file: File | null) => void;
}

export function LogoUploader({ file, onChange }: LogoUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const previewUrl = useMemo(
    () => (file ? URL.createObjectURL(file) : null),
    [file],
  );

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0];
    event.target.value = "";
    if (!selected) {
      return;
    }
    const message = validateLogoFile(selected);
    if (message) {
      setError(message);
      return;
    }
    setError(null);
    onChange(selected);
  }

  function handleRemove() {
    onChange(null);
    setError(null);
  }

  return (
    <div className="space-y-1.5">
      <label
        htmlFor={INPUT_ID}
        className="block text-[0.8125rem] font-medium text-foreground"
      >
        Logo doanh nghiệp{" "}
        <span className="font-normal text-subtle">(không bắt buộc)</span>
      </label>

      <input
        ref={inputRef}
        id={INPUT_ID}
        type="file"
        accept={LOGO_ACCEPTED_TYPES.join(",")}
        onChange={handleChange}
        className="sr-only"
      />

      {file && previewUrl ? (
        <div className="flex items-center gap-3 rounded-control border border-border p-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt="Logo doanh nghiệp"
            className="size-14 shrink-0 border border-border bg-surface object-contain"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm">{file.name}</p>
            <p className="text-xs text-subtle">{formatFileSize(file.size)}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRemove}
            aria-label="Xóa logo"
            leadingIcon={<X aria-hidden className="size-4" />}
          >
            Xóa
          </Button>
        </div>
      ) : (
        <Button
          variant="secondary"
          className="w-full"
          onClick={() => inputRef.current?.click()}
          leadingIcon={<ImagePlus aria-hidden className="size-4" />}
        >
          Tải logo lên
        </Button>
      )}

      <p className="text-xs text-subtle">PNG, JPG hoặc WEBP, tối đa 2 MB.</p>
      {error ? (
        <p role="alert" className="text-xs text-danger-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}
