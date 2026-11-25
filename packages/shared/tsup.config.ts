import { defineConfig } from "tsup";

export default defineConfig({
  entry: { index: "src/index.ts" },
  format: "esm",
  platform: "neutral",
  dts: true,
  clean: true,
  outDir: "dist",
  target: "es2022",
});
