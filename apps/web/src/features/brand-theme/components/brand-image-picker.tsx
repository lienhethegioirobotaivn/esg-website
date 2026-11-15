"use client";

import { BRAND_IMAGE_LIMITS, BRAND_IMAGE_MIME_TYPES } from "@esg/shared";
import { ImagePlus, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, DragEvent } from "react";

import { Button } from "@/components/ui";
import { useT } from "@/features/locale";
import { cn } from "@/lib/cn";

const INPUT_ID = "brand-images";
const MEGABYTE = 1024 * 1024;

interface BrandImagePickerProps {
  files: readonly File[];
  onAdd: (files: readonly File[]) => void;
  onRemove: (index: number) => void;
  disabled: boolean;
  error: string | null;
}

function Thumbnail({
  file,
  disabled,
  onRemove,
}: {
  file: File;
  disabled: boolean;
  onRemove: () => void;
}) {
  const t = useT();
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    const created = URL.createObjectURL(file);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUrl(created);
    return () => URL.revokeObjectURL(created);
  }, [file]);
  return (
    <li className="relative size-20 overflow-hidden rounded-control border border-border bg-surface">
      {url === null ? null : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={file.name} className="size-full object-contain" />
      )}
      <button
        type="button"
        disabled={disabled}
        onClick={onRemove}
        aria-label={t("Xóa ảnh {name}", { name: file.name })}
        className="absolute right-0.5 top-0.5 inline-flex size-6 items-center justify-center rounded-full bg-foreground/80 text-white hover:bg-foreground disabled:opacity-50"
      >
        <X aria-hidden className="size-3.5" />
      </button>
    </li>
  );
}

export function BrandImagePicker({
  files,
  onAdd,
  onRemove,
  disabled,
  error,
}: BrandImagePickerProps) {
  const t = useT();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const isFull = files.length >= BRAND_IMAGE_LIMITS.maxImages;

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (selected.length > 0) {
      onAdd(selected);
    }
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    if (disabled || isFull) {
      return;
    }
    onAdd(Array.from(event.dataTransfer.files));
  }

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        id={INPUT_ID}
        type="file"
        multiple
        accept={BRAND_IMAGE_MIME_TYPES.join(",")}
        onChange={handleChange}
        className="sr-only"
      />
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={cn(
          "flex flex-col items-center gap-2 rounded-card border border-dashed px-4 py-5 text-center",
          isDragging ? "border-primary-600 bg-primary-50" : "border-border-strong",
        )}
      >
        <Button
          variant="secondary"
          disabled={disabled || isFull}
          onClick={() => inputRef.current?.click()}
          leadingIcon={<ImagePlus aria-hidden className="size-4" />}
        >
          {t("Chọn ảnh thương hiệu")}
        </Button>
        <p className="text-xs text-subtle">
          {t("Hoặc kéo thả ảnh vào đây. PNG, JPG hoặc WEBP, tối đa {count} ảnh, mỗi ảnh tối đa {size} MB.", {
            count: BRAND_IMAGE_LIMITS.maxImages,
            size: BRAND_IMAGE_LIMITS.maxSourceBytes / MEGABYTE,
          })}
        </p>
      </div>
      {files.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {files.map((file, index) => (
            <Thumbnail
              key={`${file.name}:${file.size}:${file.lastModified}`}
              file={file}
              disabled={disabled}
              onRemove={() => onRemove(index)}
            />
          ))}
        </ul>
      ) : null}
      {error ? (
        <p role="alert" className="text-xs text-danger-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}
