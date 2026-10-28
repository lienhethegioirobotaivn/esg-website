const BYTES_PER_KB = 1024;
const BYTES_PER_MB = 1024 * 1024;

export function formatFileSize(bytes: number): string {
  if (bytes < BYTES_PER_KB) {
    return `${bytes} B`;
  }
  if (bytes < BYTES_PER_MB) {
    return `${Math.round(bytes / BYTES_PER_KB)} KB`;
  }
  return `${Number((bytes / BYTES_PER_MB).toFixed(1))} MB`;
}

export function padNumber(value: number): string {
  return String(value).padStart(2, "0");
}
