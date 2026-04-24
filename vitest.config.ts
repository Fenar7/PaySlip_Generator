import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    exclude: [
      "tests/**",
      "node_modules/**",
      ".next/**",
      "**/.next/**",
      "coverage/**",
      "dist/**",
    ],
    testTimeout: 30000,
    poolMatchGlobs: [
      // Isolate tests with conflicting module mocks to prevent cross-test leakage
      ["**/src/features/docs/pdf-studio/**/*.test.tsx", "forks"],
    ],
    forks: {
      singleFork: true,
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "server-only": path.resolve(__dirname, "./test-support/server-only.ts"),
    },
  },
});
