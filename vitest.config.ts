import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    // jsdom gives store/UI-adjacent code a browser-like global environment.
    environment: "jsdom",
    globals: true,
    include: ["**/*.{test,spec}.{ts,tsx}"],
    exclude: ["node_modules", ".next", "vibecode-starters"],
  },
  // Override the project's Tailwind v4 PostCSS config, which Vite cannot load
  // and which is irrelevant to our logic tests.
  css: {
    postcss: { plugins: [] },
  },
  resolve: {
    alias: {
      // Mirror the "@/*" path alias from tsconfig.json.
      "@": path.resolve(__dirname, "."),
    },
  },
});
