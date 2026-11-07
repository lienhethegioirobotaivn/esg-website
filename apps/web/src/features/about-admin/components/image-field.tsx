"use client";

import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { useRef, useState } from "react";

import { Button } from "@/components/ui";

import { AdminApiError, uploadImage } from "../lib/admin-api";
import { resizeImage } from "../lib/resize-image";

interface ImageFieldProps {
  value: string;
  onChange: (url: string) => void;
}

export function ImageField({ value, onChange }: ImageFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);
    setIsUploading(true);
    try {
      const blob = await resizeImage(file);
      onChange(await uploadImage(blob));
    } catch (caught) {
      setError(
        caught instanceof AdminApiError
          ? caught.message
          : "Không tải được ảnh. Vui lòng chọn ảnh JPG, PNG hoặc WEBP khác.",
      );
    } finally {
      setIsUploading(false);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
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
          disabled={isUploading}
          onClick={() => inputRef.current?.click()}
          leadingIcon={
            isUploading ? (
              <Loader2 aria-hidden className="size-4 animate-spin" />
            ) : (
              <ImagePlus aria-hidden className="size-4" />
            )
          }
        >
          {isUploading ? "Đang tải ảnh..." : value ? "Đổi ảnh" : "Tải ảnh lên"}
        </Button>
        {value ? (
          <Button
            variant="ghost"
            size="sm"
            disabled={isUploading}
            onClick={() => onChange("")}
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
    </div>
  );
}
