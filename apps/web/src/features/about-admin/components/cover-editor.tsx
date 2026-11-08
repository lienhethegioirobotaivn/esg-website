"use client";

import { Loader2, Minus, Plus, RotateCcw, RotateCw, Undo2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button, IconButton, Modal } from "@/components/ui";

import {
  BANNER_RATIO,
  COVER_HEIGHT,
  COVER_WIDTH,
  INITIAL_CROP,
  MAX_ZOOM,
  MIN_ZOOM,
  clampCrop,
  drawCrop,
  exportCover,
  type CropState,
} from "../lib/crop-math";

interface CoverEditorProps {
  file: File;
  onCancel: () => void;
  onConfirm: (blob: Blob) => Promise<void>;
}

const PREVIEW_WIDTH = 960;
const PREVIEW_HEIGHT = 540;
const KEY_STEP = 0.02;
const BANNER_BAND = (1 - COVER_WIDTH / BANNER_RATIO / COVER_HEIGHT) / 2;

export function CoverEditor({ file, onCancel, onConfirm }: CoverEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragRef = useRef<{ x: number; y: number } | null>(null);
  const [image, setImage] = useState<ImageBitmap | null>(null);
  const [crop, setCrop] = useState<CropState>(INITIAL_CROP);
  const [showGuide, setShowGuide] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let loaded: ImageBitmap | null = null;
    createImageBitmap(file)
      .then((bitmap) => {
        if (cancelled) {
          bitmap.close();
          return;
        }
        loaded = bitmap;
        setImage(bitmap);
      })
      .catch(() => {
        if (!cancelled) {
          setError(
            "Không đọc được ảnh. Vui lòng chọn ảnh JPG, PNG hoặc WEBP khác.",
          );
        }
      });
    return () => {
      cancelled = true;
      loaded?.close();
    };
  }, [file]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!image || !context) {
      return;
    }
    drawCrop(context, image, crop, PREVIEW_WIDTH, PREVIEW_HEIGHT);
  }, [image, crop]);

  const update = useCallback(
    (change: (current: CropState) => CropState) => {
      if (!image) {
        return;
      }
      setCrop((current) =>
        clampCrop(
          change(current),
          image.width,
          image.height,
          PREVIEW_WIDTH,
          PREVIEW_HEIGHT,
        ),
      );
    },
    [image],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    function onWheel(event: WheelEvent) {
      event.preventDefault();
      update((current) => ({
        ...current,
        zoom: current.zoom * (event.deltaY < 0 ? 1.08 : 1 / 1.08),
      }));
    }
    canvas.addEventListener("wheel", onWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", onWheel);
  }, [update, image]);

  function handlePointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { x: event.clientX, y: event.clientY };
  }

  function handlePointerMove(event: React.PointerEvent<HTMLCanvasElement>) {
    const start = dragRef.current;
    if (!start) {
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    const dx = (event.clientX - start.x) / rect.width;
    const dy = (event.clientY - start.y) / rect.height;
    dragRef.current = { x: event.clientX, y: event.clientY };
    update((current) => ({
      ...current,
      fx: current.fx + dx,
      fy: current.fy + dy,
    }));
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLCanvasElement>) {
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [-KEY_STEP, 0],
      ArrowRight: [KEY_STEP, 0],
      ArrowUp: [0, -KEY_STEP],
      ArrowDown: [0, KEY_STEP],
    };
    const move = moves[event.key];
    if (move) {
      event.preventDefault();
      update((current) => ({
        ...current,
        fx: current.fx + move[0],
        fy: current.fy + move[1],
      }));
    } else if (event.key === "+" || event.key === "=") {
      update((current) => ({ ...current, zoom: current.zoom * 1.1 }));
    } else if (event.key === "-") {
      update((current) => ({ ...current, zoom: current.zoom / 1.1 }));
    }
  }

  function rotate(direction: 1 | -1) {
    update((current) => ({
      ...current,
      rotation: (current.rotation + direction + 4) % 4,
      fx: 0,
      fy: 0,
    }));
  }

  async function handleConfirm() {
    if (!image) {
      return;
    }
    setError(null);
    setIsSaving(true);
    try {
      await onConfirm(await exportCover(image, crop));
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Không tải được ảnh.",
      );
      setIsSaving(false);
    }
  }

  return (
    <Modal
      title="Chỉnh ảnh bìa"
      onClose={isSaving ? () => undefined : onCancel}
    >
      <div className="space-y-4">
        <p className="text-sm text-muted">
          Kéo ảnh để căn vị trí, dùng thanh trượt hoặc con lăn chuột để phóng
          to, thu nhỏ. Ảnh được cắt theo tỉ lệ 16:9 như thẻ tin trên web.
        </p>

        <div className="relative overflow-hidden rounded-card border border-border bg-surface-muted">
          <canvas
            ref={canvasRef}
            width={PREVIEW_WIDTH}
            height={PREVIEW_HEIGHT}
            tabIndex={0}
            aria-label="Khung ảnh bìa, dùng phím mũi tên để di chuyển, phím cộng trừ để thu phóng"
            data-testid="cover-canvas"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={() => {
              dragRef.current = null;
            }}
            onPointerCancel={() => {
              dragRef.current = null;
            }}
            onKeyDown={handleKeyDown}
            className="block aspect-video w-full cursor-grab touch-none active:cursor-grabbing"
          />
          {image && showGuide ? (
            <div aria-hidden className="pointer-events-none absolute inset-0">
              <div
                className="absolute inset-x-0 top-0 bg-foreground/45"
                style={{ height: `${BANNER_BAND * 100}%` }}
              />
              <div
                className="absolute inset-x-0 bottom-0 bg-foreground/45"
                style={{ height: `${BANNER_BAND * 100}%` }}
              />
              <span
                className="absolute left-2 rounded bg-surface/90 px-1.5 py-0.5 text-[11px] font-semibold text-foreground"
                style={{ top: `calc(${BANNER_BAND * 100}% + 4px)` }}
              >
                Vùng hiển thị ở đầu trang bài viết
              </span>
            </div>
          ) : null}
          {!image && !error ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 aria-hidden className="size-6 animate-spin text-muted" />
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <IconButton
            label="Thu nhỏ"
            disabled={!image}
            onClick={() =>
              update((current) => ({ ...current, zoom: current.zoom / 1.15 }))
            }
          >
            <Minus aria-hidden className="size-4" />
          </IconButton>
          <input
            type="range"
            aria-label="Mức phóng to"
            min={MIN_ZOOM}
            max={MAX_ZOOM}
            step={0.01}
            value={crop.zoom}
            disabled={!image}
            onChange={(event) =>
              update((current) => ({
                ...current,
                zoom: Number(event.target.value),
              }))
            }
            className="min-w-40 flex-1 accent-primary-600"
          />
          <IconButton
            label="Phóng to"
            disabled={!image}
            onClick={() =>
              update((current) => ({ ...current, zoom: current.zoom * 1.15 }))
            }
          >
            <Plus aria-hidden className="size-4" />
          </IconButton>
          <span className="w-12 text-right text-sm tabular-nums text-muted">
            {Math.round(crop.zoom * 100)}%
          </span>
          <IconButton
            label="Xoay trái"
            disabled={!image}
            onClick={() => rotate(-1)}
          >
            <RotateCcw aria-hidden className="size-4" />
          </IconButton>
          <IconButton
            label="Xoay phải"
            disabled={!image}
            onClick={() => rotate(1)}
          >
            <RotateCw aria-hidden className="size-4" />
          </IconButton>
          <IconButton
            label="Đặt lại"
            disabled={!image}
            onClick={() => setCrop(INITIAL_CROP)}
          >
            <Undo2 aria-hidden className="size-4" />
          </IconButton>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={showGuide}
            onChange={(event) => setShowGuide(event.target.checked)}
            className="size-4 accent-primary-600"
          />
          Hiện vùng hiển thị ở đầu trang bài viết (tỉ lệ 2,7:1)
        </label>

        {error ? (
          <p role="alert" className="text-sm text-danger-600">
            {error}
          </p>
        ) : null}

        <div className="flex justify-end gap-2 border-t border-border pt-4">
          <Button variant="secondary" disabled={isSaving} onClick={onCancel}>
            Hủy
          </Button>
          <Button
            disabled={!image || isSaving}
            onClick={() => void handleConfirm()}
            leadingIcon={
              isSaving ? (
                <Loader2 aria-hidden className="size-4 animate-spin" />
              ) : undefined
            }
          >
            {isSaving ? "Đang tải ảnh..." : "Dùng ảnh này"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
