export interface ReportLogo {
  readonly src: string;
  readonly width: number;
  readonly height: number;
}

const MAX_SIDE = 480;

export async function prepareReportLogo(file: File): Promise<ReportLogo> {
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Canvas is not available");
    }
    context.drawImage(bitmap, 0, 0, width, height);
    return { src: canvas.toDataURL("image/png"), width, height };
  } finally {
    bitmap.close();
  }
}
