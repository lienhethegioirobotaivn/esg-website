export const COVER_WIDTH = 1600;
export const COVER_HEIGHT = 900;
export const BANNER_RATIO = 2.7;
export const MIN_ZOOM = 1;
export const MAX_ZOOM = 4;

export interface CropState {
  zoom: number;
  fx: number;
  fy: number;
  rotation: number;
}

export const INITIAL_CROP: CropState = { zoom: 1, fx: 0, fy: 0, rotation: 0 };

export function orientedSize(
  width: number,
  height: number,
  rotation: number,
): { width: number; height: number } {
  return rotation % 2 === 0
    ? { width, height }
    : { width: height, height: width };
}

export function coverScale(
  imageWidth: number,
  imageHeight: number,
  frameWidth: number,
  frameHeight: number,
): number {
  return Math.max(frameWidth / imageWidth, frameHeight / imageHeight);
}

export function clampCrop(
  crop: CropState,
  imageWidth: number,
  imageHeight: number,
  frameWidth: number,
  frameHeight: number,
): CropState {
  const size = orientedSize(imageWidth, imageHeight, crop.rotation);
  const zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, crop.zoom));
  const scale =
    coverScale(size.width, size.height, frameWidth, frameHeight) * zoom;
  const maxX = Math.max(0, (size.width * scale - frameWidth) / 2 / frameWidth);
  const maxY = Math.max(
    0,
    (size.height * scale - frameHeight) / 2 / frameHeight,
  );
  return {
    rotation: crop.rotation,
    zoom,
    fx: Math.min(maxX, Math.max(-maxX, crop.fx)),
    fy: Math.min(maxY, Math.max(-maxY, crop.fy)),
  };
}

export function drawCrop(
  context: CanvasRenderingContext2D,
  image: ImageBitmap,
  crop: CropState,
  frameWidth: number,
  frameHeight: number,
): void {
  const clamped = clampCrop(
    crop,
    image.width,
    image.height,
    frameWidth,
    frameHeight,
  );
  const size = orientedSize(image.width, image.height, clamped.rotation);
  const scale =
    coverScale(size.width, size.height, frameWidth, frameHeight) * clamped.zoom;
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, frameWidth, frameHeight);
  context.save();
  context.translate(
    frameWidth / 2 + clamped.fx * frameWidth,
    frameHeight / 2 + clamped.fy * frameHeight,
  );
  context.rotate((clamped.rotation * Math.PI) / 2);
  context.scale(scale, scale);
  context.drawImage(image, -image.width / 2, -image.height / 2);
  context.restore();
}

export function exportCover(
  image: ImageBitmap,
  crop: CropState,
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = COVER_WIDTH;
  canvas.height = COVER_HEIGHT;
  const context = canvas.getContext("2d");
  if (context === null) {
    return Promise.reject(new Error("Trình duyệt không hỗ trợ xử lý ảnh."));
  }
  drawCrop(context, image, crop, COVER_WIDTH, COVER_HEIGHT);
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob === null
          ? reject(new Error("Không xử lý được ảnh."))
          : resolve(blob),
      "image/jpeg",
      0.88,
    );
  });
}
