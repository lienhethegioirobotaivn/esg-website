export function loadEnvFile(path = ".env"): void {
  const mode = process.env["NODE_ENV"];
  if (mode !== undefined && mode !== "development") {
    return;
  }
  try {
    process.loadEnvFile(path);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }
}
