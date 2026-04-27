import { defineConfig } from "vitest/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(rootDir, "src"),
    },
  },
  test: {
    environment: "jsdom",
    include: ["*.test.ts", "src/**/*.test.ts", "src/**/*.test.tsx", "scripts/**/*.test.mjs"],
    setupFiles: ["./src/test/setup.ts"],
  },
});
