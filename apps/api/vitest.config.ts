import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: "./",
    include: ["src/**/*.spec.ts", "test/**/*.spec.ts"],
    exclude: ["**/*.integration.spec.ts", "node_modules/**", "dist/**"],
    testTimeout: 20000,
  },
});
