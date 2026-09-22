import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
  test: {
    include: ["tests/unit/**/*.test.ts"],
    environment: "node",
    coverage: {
      provider: "v8",
      include: ["src/lib/**/*.ts", "importers/**/*.ts", "scripts/lib/**/*.ts"],
      reporter: ["text", "json-summary"],
    },
  },
  resolve: {
    alias: { "@": resolve(import.meta.dirname, "src") },
  },
});
