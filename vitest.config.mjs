import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  // The project keeps JSX in .js files (Next.js convention); tell the transformer to parse them as JSX.
  oxc: { include: /\.(js|jsx|mjs)$/, exclude: /node_modules/, lang: "jsx", jsx: { runtime: "automatic" } },
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "src") } },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.js"],
    include: ["tests/unit/**/*.test.{js,jsx}", "tests/components/**/*.test.{js,jsx}"],
  },
});
