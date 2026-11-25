export interface UploadedFile {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
}

export type UploadedFiles = Readonly<Record<string, readonly UploadedFile[] | undefined>>;

export function firstFile(files: UploadedFiles | undefined, field: string): UploadedFile | null {
  const file = files?.[field]?.[0];
  return file !== undefined && file.size > 0 ? file : null;
}
