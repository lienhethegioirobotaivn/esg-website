import {
  BRAND_IMAGE_LIMITS,
  BRAND_IMAGE_MIME_TYPES,
  mergePalettes,
  paletteFromPixels,
} from "@esg/shared";
import type { PaletteColor } from "@esg/shared";

import { msg } from "@/features/locale/lib/translate";

export class BrandImageError extends Error {}

export interface PreparedBrandImage {
  readonly name: string;
  readonly blob: Blob;
}

export interface PreparedBrandImages {
  readonly images: readonly PreparedBrandImage[];
  readonly palette: readonly PaletteColor[];
}

const PALETTE_SIDE = 96;
const QUALITIES = [0.85, 0.7, 0.55] as const;
const SHRINK = 0.8;
const MIN_SIDE = 320;
const DARK_BACKDROP = "#3A3A3A";
const LIGHT_BACKDROP = "#FFFFFF";

function isAllowedType(type: string): boolean {
  return (BRAND_IMAGE_MIME_TYPES as readonly string[]).includes(type);
}

function createCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function context2d(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (context === null) {
    throw new BrandImageError(msg("Trình duyệt không hỗ trợ xử lý ảnh."));
  }
  return context;
}

function fitSize(width: number, height: number, maxSide: number): [number, number] {
  const scale = Math.min(1, maxSide / Math.max(width, height));
  return [Math.max(1, Math.round(width * scale)), Math.max(1, Math.round(height * scale))];
}

function paletteOf(bitmap: ImageBitmap): { palette: PaletteColor[]; lightOnClear: boolean } {
  const [width, height] = fitSize(bitmap.width, bitmap.height, PALETTE_SIDE);
  const context = context2d(createCanvas(width, height));
  context.drawImage(bitmap, 0, 0, width, height);
  const { data } = context.getImageData(0, 0, width, height);
  let clear = 0;
  let opaque = 0;
  let lightness = 0;
  for (let index = 0; index + 3 < data.length; index += 4) {
    if ((data[index + 3] ?? 0) < 128) {
      clear += 1;
    } else {
      opaque += 1;
      lightness += Math.max(data[index] ?? 0, data[index + 1] ?? 0, data[index + 2] ?? 0);
    }
  }
  const total = clear + opaque;
  const lightOnClear = total > 0 && clear / total > 0.1 && opaque > 0 && lightness / opaque > 200;
  return { palette: paletteFromPixels(data), lightOnClear };
}

function toJpeg(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob === null
          ? reject(new BrandImageError(msg("Không xử lý được ảnh.")))
          : resolve(blob),
      "image/jpeg",
      quality,
    );
  });
}

async function encode(bitmap: ImageBitmap, backdrop: string, budget: number): Promise<Blob> {
  let side: number = BRAND_IMAGE_LIMITS.maxSide;
  for (;;) {
    const [width, height] = fitSize(bitmap.width, bitmap.height, side);
    const canvas = createCanvas(width, height);
    const context = context2d(canvas);
    context.fillStyle = backdrop;
    context.fillRect(0, 0, width, height);
    context.drawImage(bitmap, 0, 0, width, height);
    let last: Blob | null = null;
    for (const quality of QUALITIES) {
      last = await toJpeg(canvas, quality);
      if (last.size <= budget) {
        return last;
      }
    }
    if (side <= MIN_SIDE) {
      if (last !== null && last.size <= budget * 1.5) {
        return last;
      }
      throw new BrandImageError(msg("Ảnh quá lớn. Hãy chọn ít ảnh hơn hoặc ảnh nhẹ hơn."));
    }
    side = Math.max(MIN_SIDE, Math.round(side * SHRINK));
  }
}

export async function prepareBrandImages(files: readonly File[]): Promise<PreparedBrandImages> {
  if (files.length === 0) {
    throw new BrandImageError(msg("Hãy chọn ít nhất một ảnh."));
  }
  if (files.length > BRAND_IMAGE_LIMITS.maxImages) {
    throw new BrandImageError(msg("Số ảnh vượt quá giới hạn cho phép."));
  }
  for (const file of files) {
    if (!isAllowedType(file.type)) {
      throw new BrandImageError(msg("Chỉ nhận ảnh PNG, JPG hoặc WEBP."));
    }
    if (file.size > BRAND_IMAGE_LIMITS.maxSourceBytes) {
      throw new BrandImageError(msg("Ảnh quá lớn. Hãy chọn ít ảnh hơn hoặc ảnh nhẹ hơn."));
    }
  }

  const budget = Math.min(
    BRAND_IMAGE_LIMITS.maxPreparedBytes,
    Math.floor(BRAND_IMAGE_LIMITS.maxTotalPreparedBytes / files.length),
  );
  const images: PreparedBrandImage[] = [];
  const palettes: PaletteColor[][] = [];
  for (const [index, file] of files.entries()) {
    let bitmap: ImageBitmap;
    try {
      bitmap = await createImageBitmap(file);
    } catch {
      throw new BrandImageError(msg("Không đọc được ảnh. Hãy thử ảnh khác."));
    }
    try {
      const { palette, lightOnClear } = paletteOf(bitmap);
      palettes.push(palette);
      const blob = await encode(bitmap, lightOnClear ? DARK_BACKDROP : LIGHT_BACKDROP, budget);
      images.push({ name: `brand-${index + 1}.jpg`, blob });
    } finally {
      bitmap.close();
    }
  }
  return { images, palette: mergePalettes(palettes) };
}
